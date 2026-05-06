import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Loader2, Hash, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { getEncoding } from 'js-tiktoken';

const enc = getEncoding('cl100k_base');
function countTokens(text: string): number {
  if (!text) return 0;
  return enc.encode(text).length;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function TokenServicePlayground() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [model, setModel] = useState('claude-sonnet-4.6');
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const inputTokens = useMemo(() => countTokens(input), [input]);
  const totalTokens = useMemo(() => messages.reduce((sum, m) => sum + (m.tokens || 0), 0), [messages]);

  const isKeyValid = apiKey.startsWith('vb-sk-');

  // Determine format from model name
  const isAnthropicFormat = model.startsWith('claude-');

  const sendMessage = async () => {
    if (!input.trim() || !isKeyValid) return;
    const tokens = countTokens(input);
    const userMsg: Message = { role: 'user', content: input, tokens };
    setMessages((prev) => [...prev, userMsg]);
    const currentMessages = [...messages, userMsg];
    setInput('');
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url = `${SUPABASE_URL}/functions/v1/ai-proxy`;
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };

      let body: any;
      if (isAnthropicFormat) {
        // Anthropic messages format
        body = {
          model,
          max_tokens: 2048,
          messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
          stream: true,
        };
      } else {
        // OpenAI chat completions format
        body = {
          model,
          messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
          stream: true,
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      // Stream response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantText = '';

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: 'assistant', content: '', tokens: 0 }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            // OpenAI format
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) assistantText += delta;
            // Anthropic format
            if (parsed.type === 'content_block_delta') {
              assistantText += parsed.delta?.text || '';
            }
          } catch {
            // ignore
          }
        }

        // Update message in place
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: assistantText,
              tokens: countTokens(assistantText),
            };
          }
          return updated;
        });
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev.filter(m => !(m.role === 'assistant' && !m.content)),
          { role: 'assistant', content: `❌ 错误: ${e.message}`, tokens: 0 },
        ]);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">请先登录</h2>
          <Link to="/auth"><Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">登录</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('token_service.playground_title')}</h1>
            <p className="text-sm text-muted-foreground">{t('token_service.playground_subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-52 bg-card border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-opus-4.7">Claude Opus 4.7</SelectItem>
                <SelectItem value="claude-sonnet-4.6">Claude Sonnet 4.6</SelectItem>
                <SelectItem value="claude-haiku-4.5">Claude Haiku 4.5</SelectItem>
                <SelectItem value="gpt-5.5">GPT-5.5</SelectItem>
                <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
                <SelectItem value="gpt-5.4-mini">GPT-5.4 Mini</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="text-xs gap-1">
              <Hash className="h-3 w-3" />
              {totalTokens} tokens
            </Badge>
          </div>
        </div>

        {/* API Key input */}
        {!isKeyValid && (
          <div className="mb-4 p-4 rounded-lg border border-border/50 bg-card/50 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Key className="h-4 w-4" />
              输入你的 API Key 来体验（前往 <Link to="/token-service/api-keys" className="text-purple-400 underline">API Keys 页面</Link> 创建）
            </div>
            <Input
              placeholder="vb-sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono text-sm bg-background"
            />
          </div>
        )}

        <div className="border-border/50 bg-card/50 backdrop-blur-sm min-h-[500px] flex flex-col rounded-xl border">
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                {t('token_service.playground_send_hint')}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-purple-400" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-purple-600/20 text-foreground'
                    : 'bg-card border border-border/50 text-foreground'
                }`}>
                  {msg.content}
                  {msg.tokens !== undefined && msg.tokens > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-1 opacity-60">{msg.tokens} tokens</div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-blue-400" />
                  </div>
                )}
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-purple-400" />
                </div>
                <div className="bg-card border border-border/50 rounded-xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/50 p-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Textarea
                  placeholder={t('token_service.playground_input_placeholder')}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  className="resize-none bg-background border-border/50 min-h-[44px] max-h-32"
                  rows={1}
                />
                {input.length > 0 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    <Hash className="h-3 w-3 inline mr-0.5" />{inputTokens} tokens
                  </div>
                )}
              </div>
              <Button
                onClick={sendMessage}
                disabled={loading || !input.trim() || !isKeyValid}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 shrink-0"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
