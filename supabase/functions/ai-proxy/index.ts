import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Approximate token estimator (chars/4) used only as fallback when upstream usage missing.
function approxTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function approxMessageTokens(messages: any[], system?: string): number {
  let total = system ? approxTokens(system) : 0;
  for (const m of messages || []) {
    total += 4;
    if (typeof m.content === "string") total += approxTokens(m.content);
    else if (Array.isArray(m.content)) {
      for (const part of m.content) if (part.type === "text") total += approxTokens(part.text || "");
    }
  }
  return total;
}

async function hashKey(key: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(body: any, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

// Fetch with timeout + 1 retry on network/5xx errors
async function fetchUpstream(url: string, init: RequestInit, timeoutMs = 120000): Promise<Response> {
  const attempt = async (): Promise<Response> => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: ctl.signal });
    } finally {
      clearTimeout(t);
    }
  };
  try {
    const r = await attempt();
    if (r.status >= 500 && r.status < 600) {
      try { return await attempt(); } catch { return r; }
    }
    return r;
  } catch (e) {
    return await attempt();
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();

  // --- Auth ---
  const authHeader = req.headers.get("authorization") || "";
  const apiKey = authHeader.replace(/^Bearer\s+/i, "");
  if (!apiKey || !apiKey.startsWith("vb-sk-")) {
    return jsonResponse({ error: "Invalid API key. Must start with vb-sk-" }, 401);
  }

  // --- Parse body ---
  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, 400); }
  const requestedModel = body.model;
  if (!requestedModel) return jsonResponse({ error: "Missing 'model' field" }, 400);

  // --- Single preflight RPC: auth + mapping + provider + balance + rate-limit ---
  const keyHash = await hashKey(apiKey);
  const { data: pre, error: preErr } = await supabaseAdmin.rpc("ai_proxy_preflight", {
    _key_hash: keyHash,
    _source_model: requestedModel,
  });
  if (preErr) {
    console.error("preflight rpc error:", preErr);
    return jsonResponse({ error: "Internal preflight error" }, 500);
  }
  if (!pre?.ok) {
    return jsonResponse({ error: pre?.error || "Preflight failed" }, pre?.status || 400);
  }

  const userId: string = pre.user_id;
  const apiKeyId: string = pre.api_key_id;
  const targetModel: string = pre.target_model;
  const config = pre.config || {};
  const format = config.format || "openai";
  const costMultiplier = config.cost_multiplier || 1;

  const providerApiKey = Deno.env.get(pre.api_key_ref);
  if (!providerApiKey) return jsonResponse({ error: "Provider API key not configured" }, 503);

  // --- Build upstream request ---
  const isStream = body.stream === true;
  let upstreamUrl: string;
  const upstreamHeaders: Record<string, string> = { "Content-Type": "application/json" };
  if (format === "anthropic") {
    upstreamUrl = `${pre.base_url_anthropic}/v1/messages`;
    upstreamHeaders["x-api-key"] = providerApiKey;
    upstreamHeaders["anthropic-version"] = "2023-06-01";
  } else {
    upstreamUrl = `${pre.base_url_openai}/chat/completions`;
    upstreamHeaders["Authorization"] = `Bearer ${providerApiKey}`;
    // Ask OpenAI-compatible providers to include usage in the final stream chunk
    if (isStream) {
      body.stream_options = { ...(body.stream_options || {}), include_usage: true };
    }
  }

  const messages = body.messages || [];
  const fallbackPromptTokens = approxMessageTokens(messages, body.system);
  const upstreamBody = { ...body, model: targetModel };

  // --- Forward ---
  const upstreamResponse = await fetchUpstream(upstreamUrl, {
    method: "POST",
    headers: upstreamHeaders,
    body: JSON.stringify(upstreamBody),
  });

  const latencyMs = Date.now() - startTime;

  if (!upstreamResponse.ok) {
    const errText = await upstreamResponse.text();
    console.error("Upstream error:", upstreamResponse.status, errText);
    // Background log (don't block response)
    // @ts-ignore EdgeRuntime is provided by Supabase Deno runtime
    EdgeRuntime.waitUntil(
      supabaseAdmin.rpc("ai_proxy_finalize", {
        _user_id: userId,
        _api_key_id: apiKeyId,
        _model_requested: requestedModel,
        _model_actual: targetModel,
        _prompt_tokens: fallbackPromptTokens,
        _completion_tokens: 0,
        _billed_tokens: 0,
        _latency_ms: latencyMs,
        _status_code: upstreamResponse.status,
        _is_stream: isStream,
      })
    );
    return new Response(errText, {
      status: upstreamResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- Streaming: zero-copy passthrough, parse usage from final chunk ---
  if (isStream) {
    const readable = upstreamResponse.body;
    if (!readable) return jsonResponse({ error: "No stream body from upstream" }, 502);

    let promptTokens = 0;
    let completionTokens = 0;
    let sawUsage = false;
    let approxCompletionLen = 0;

    const decoder = new TextDecoder();
    let buf = "";

    const transform = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk); // pass-through immediately
        // Lightly inspect for usage — only parse the trailing portion
        try {
          buf += decoder.decode(chunk, { stream: true });
          const parts = buf.split("\n");
          buf = parts.pop() || "";
          for (const line of parts) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            // Fast path: skip lines without "usage" or content delta unless cheap to parse
            const hasUsage = data.includes('"usage"');
            const hasDelta = !sawUsage && data.includes('"delta"');
            if (!hasUsage && !hasDelta) continue;
            try {
              const p = JSON.parse(data);
              if (p.usage) {
                promptTokens = p.usage.prompt_tokens ?? p.usage.input_tokens ?? promptTokens;
                completionTokens = p.usage.completion_tokens ?? p.usage.output_tokens ?? completionTokens;
                sawUsage = true;
              }
              if (!sawUsage) {
                const d = p.choices?.[0]?.delta?.content;
                if (typeof d === "string") approxCompletionLen += d.length;
                if (p.type === "content_block_delta") approxCompletionLen += (p.delta?.text || "").length;
              }
            } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
      },
      flush() {
        if (!sawUsage) {
          promptTokens = fallbackPromptTokens;
          completionTokens = Math.ceil(approxCompletionLen / 4);
        }
        const total = promptTokens + completionTokens;
        const billed = Math.ceil(total * costMultiplier);
        // Background finalize
        // @ts-ignore EdgeRuntime
        EdgeRuntime.waitUntil(
          supabaseAdmin.rpc("ai_proxy_finalize", {
            _user_id: userId,
            _api_key_id: apiKeyId,
            _model_requested: requestedModel,
            _model_actual: targetModel,
            _prompt_tokens: promptTokens,
            _completion_tokens: completionTokens,
            _billed_tokens: billed,
            _latency_ms: Date.now() - startTime,
            _status_code: 200,
            _is_stream: true,
          })
        );
      },
    });

    return new Response(readable.pipeThrough(transform), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // --- Non-streaming ---
  const responseData = await upstreamResponse.json();
  let promptTokens = fallbackPromptTokens;
  let completionTokens = 0;
  if (responseData.usage) {
    promptTokens = responseData.usage.prompt_tokens ?? responseData.usage.input_tokens ?? promptTokens;
    completionTokens = responseData.usage.completion_tokens ?? responseData.usage.output_tokens ?? 0;
  } else if (format === "openai") {
    completionTokens = approxTokens(responseData.choices?.[0]?.message?.content || "");
  } else {
    completionTokens = approxTokens(responseData.content?.[0]?.text || "");
  }
  const total = promptTokens + completionTokens;
  const billed = Math.ceil(total * costMultiplier);

  // Background finalize — return immediately
  // @ts-ignore EdgeRuntime
  EdgeRuntime.waitUntil(
    supabaseAdmin.rpc("ai_proxy_finalize", {
      _user_id: userId,
      _api_key_id: apiKeyId,
      _model_requested: requestedModel,
      _model_actual: targetModel,
      _prompt_tokens: promptTokens,
      _completion_tokens: completionTokens,
      _billed_tokens: billed,
      _latency_ms: Date.now() - startTime,
      _status_code: upstreamResponse.status,
      _is_stream: false,
    })
  );

  return new Response(JSON.stringify(responseData), {
    status: upstreamResponse.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
