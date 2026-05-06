import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getEncoding } from "js-tiktoken";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const enc = getEncoding("cl100k_base");
function countTokens(text: string): number {
  if (!text) return 0;
  return enc.encode(text).length;
}

function countMessageTokens(messages: any[]): number {
  let total = 0;
  for (const m of messages) {
    total += 4; // per-message overhead
    if (typeof m.content === "string") {
      total += countTokens(m.content);
    } else if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if (part.type === "text") total += countTokens(part.text || "");
      }
    }
    if (m.role) total += countTokens(m.role);
  }
  return total;
}

async function hashKey(key: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(key)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function jsonResponse(body: any, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  // --- Auth: extract API key ---
  const authHeader = req.headers.get("authorization") || "";
  const apiKey = authHeader.replace(/^Bearer\s+/i, "");
  if (!apiKey || !apiKey.startsWith("vb-sk-")) {
    return jsonResponse({ error: "Invalid API key. Must start with vb-sk-" }, 401);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify key
  const keyHash = await hashKey(apiKey);
  const { data: keyRow, error: keyErr } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id, status, rpm_limit")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (keyErr || !keyRow || keyRow.status !== "active") {
    return jsonResponse({ error: "Invalid or revoked API key" }, 401);
  }

  const userId = keyRow.user_id;
  const apiKeyId = keyRow.id;

  // --- Parse request body ---
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const requestedModel = body.model;
  if (!requestedModel) {
    return jsonResponse({ error: "Missing 'model' field" }, 400);
  }

  // --- Model mapping ---
  const { data: mapping } = await supabaseAdmin
    .from("model_mappings")
    .select("target_model, config, provider_id")
    .eq("source_model", requestedModel)
    .eq("is_active", true)
    .maybeSingle();

  if (!mapping) {
    return jsonResponse({ error: `Model '${requestedModel}' not found` }, 400);
  }

  const format = mapping.config?.format || "openai";
  const costMultiplier = mapping.config?.cost_multiplier || 1;

  // --- Get provider ---
  const { data: provider } = await supabaseAdmin
    .from("ai_providers")
    .select("base_url_openai, base_url_anthropic, api_key_ref, is_active")
    .eq("id", mapping.provider_id)
    .maybeSingle();

  if (!provider?.is_active) {
    return jsonResponse({ error: "Provider is currently unavailable" }, 503);
  }

  const providerApiKey = Deno.env.get(provider.api_key_ref);
  if (!providerApiKey) {
    return jsonResponse({ error: "Provider API key not configured" }, 503);
  }

  // --- Balance check ---
  const { data: balance } = await supabaseAdmin
    .from("token_balances")
    .select("total_balance, used_balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (!balance || (balance.total_balance - balance.used_balance) < 100) {
    return jsonResponse({ error: "Insufficient token balance", code: "insufficient_balance" }, 402);
  }

  // --- Rate limiting (RPM) ---
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  const { count: recentRequests } = await supabaseAdmin
    .from("api_request_logs")
    .select("id", { count: "exact", head: true })
    .eq("api_key_id", apiKeyId)
    .gte("created_at", oneMinuteAgo);

  const rpmLimit = keyRow.rpm_limit || 60;
  if ((recentRequests || 0) >= rpmLimit) {
    return jsonResponse(
      { error: "Rate limit exceeded", type: "rate_limit_error" },
      429
    );
  }

  // --- Build upstream request ---
  const isStream = body.stream === true;
  const targetModel = mapping.target_model;

  let upstreamUrl: string;
  const upstreamHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (format === "anthropic") {
    upstreamUrl = `${provider.base_url_anthropic}/v1/messages`;
    upstreamHeaders["x-api-key"] = providerApiKey;
    upstreamHeaders["anthropic-version"] = "2023-06-01";
  } else {
    upstreamUrl = `${provider.base_url_openai}/chat/completions`;
    upstreamHeaders["Authorization"] = `Bearer ${providerApiKey}`;
  }

  // Count prompt tokens
  const messages = body.messages || [];
  const systemText = body.system || "";
  let promptTokens = countMessageTokens(messages);
  if (systemText) promptTokens += countTokens(systemText);

  // Replace model in body
  const upstreamBody = { ...body, model: targetModel };

  // --- Forward request ---
  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify(upstreamBody),
    });
  } catch (e) {
    return jsonResponse({ error: "Upstream provider error", detail: String(e) }, 502);
  }

  const latencyMs = Date.now() - startTime;

  if (!upstreamResponse.ok) {
    const errText = await upstreamResponse.text();
    console.error("Upstream error:", upstreamResponse.status, errText);
    // Log failed request
    await supabaseAdmin.from("api_request_logs").insert({
      user_id: userId,
      api_key_id: apiKeyId,
      model_requested: requestedModel,
      model_actual: targetModel,
      provider: "minimax",
      status_code: upstreamResponse.status,
      prompt_tokens: promptTokens,
      completion_tokens: 0,
      total_tokens: promptTokens,
      latency_ms: latencyMs,
      is_stream: isStream,
    });
    return new Response(errText, {
      status: upstreamResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- Handle streaming ---
  if (isStream) {
    const readable = upstreamResponse.body;
    if (!readable) {
      return jsonResponse({ error: "No stream body from upstream" }, 502);
    }

    // For streaming, we'll collect completion text for token counting
    let completionText = "";
    const reader = readable.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));

            // Try to extract text content from SSE chunks
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                // OpenAI format
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) completionText += delta;
                // Anthropic format
                if (parsed.type === "content_block_delta") {
                  completionText += parsed.delta?.text || "";
                }
              } catch {
                // ignore parse errors in stream
              }
            }
          }
        } catch (e) {
          console.error("Stream error:", e);
        } finally {
          controller.close();

          // Post-stream: count and bill
          const completionTokens = countTokens(completionText);
          const totalTokens = promptTokens + completionTokens;
          const billedTokens = Math.ceil(totalTokens * costMultiplier);

          await supabaseAdmin.rpc("deduct_tokens", {
            _user_id: userId,
            _amount: billedTokens,
          });

          await supabaseAdmin.from("api_request_logs").insert({
            user_id: userId,
            api_key_id: apiKeyId,
            model_requested: requestedModel,
            model_actual: targetModel,
            provider: "minimax",
            status_code: 200,
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
            latency_ms: Date.now() - startTime,
            is_stream: true,
            cost_cents: billedTokens,
          });

          // Update api_keys stats
          // Update api_keys stats
          const { data: currentKey } = await supabaseAdmin
            .from("api_keys")
            .select("total_requests, total_tokens_used")
            .eq("id", apiKeyId)
            .single();
          if (currentKey) {
            await supabaseAdmin
              .from("api_keys")
              .update({
                total_requests: (currentKey.total_requests || 0) + 1,
                total_tokens_used: (currentKey.total_tokens_used || 0) + totalTokens,
                last_used_at: new Date().toISOString(),
              })
              .eq("id", apiKeyId);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // --- Handle non-streaming ---
  const responseData = await upstreamResponse.json();

  // Extract completion tokens
  let completionTokens = 0;
  if (format === "openai") {
    // OpenAI format: choices[0].message.content
    const content = responseData.choices?.[0]?.message?.content || "";
    completionTokens = countTokens(content);
  } else {
    // Anthropic format: content[0].text
    const content = responseData.content?.[0]?.text || "";
    completionTokens = countTokens(content);
  }

  const totalTokens = promptTokens + completionTokens;
  const billedTokens = Math.ceil(totalTokens * costMultiplier);

  // Deduct balance
  await supabaseAdmin.rpc("deduct_tokens", {
    _user_id: userId,
    _amount: billedTokens,
  });

  // Log request
  await supabaseAdmin.from("api_request_logs").insert({
    user_id: userId,
    api_key_id: apiKeyId,
    model_requested: requestedModel,
    model_actual: targetModel,
    provider: "minimax",
    status_code: upstreamResponse.status,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    latency_ms: latencyMs,
    is_stream: false,
    cost_cents: billedTokens,
  });

  // Update api_keys stats
  const { data: currentKey } = await supabaseAdmin
    .from("api_keys")
    .select("total_requests, total_tokens_used")
    .eq("id", apiKeyId)
    .single();
  if (currentKey) {
    await supabaseAdmin
      .from("api_keys")
      .update({
        total_requests: (currentKey.total_requests || 0) + 1,
        total_tokens_used: (currentKey.total_tokens_used || 0) + totalTokens,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", apiKeyId);
  }

  return new Response(JSON.stringify(responseData), {
    status: upstreamResponse.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
