import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Loader2, Hash, Key, Square, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { getEncoding } from 'js-tiktoken';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

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

/* ---------- Code block with copy button ---------- */
function CodeBlock({ children, className, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const codeText = String(children).replace(/\n$/, '');
  const lang = className?.replace('language-', '') || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border/40 bg-[hsl(var(--background))]">
      {lang && (
        <div className="flex items-center justify-between px-4 py-1.5 text-[11px] text-muted-foreground bg-muted/30 border-b border-border/30">
          <span>{lang}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed !bg-transparent !m-0">
        <code className={className} {...props}>{children}</code>
      </pre>
      {!lang && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      )}
    </div>
  );
}

/* ---------- Markdown renderer ---------- */
function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        code({ className, children, ...props }) {
          const isBlock = className?.startsWith('language-') || String(children).includes('\n');
          if (isBlock) {
            return <CodeBlock className={className} {...props}>{children}</CodeBlock>;
          }
          return (
            <code className="px-1.5 py-0.5 rounded bg-muted/50 text-[13px] font-mono text-foreground" {...props}>
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
        },
        ul({ children }) {
          return <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },
        h1({ children }) {
          return <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-sm font-bold mb-1.5 mt-2 first:mt-0">{children}</h3>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-purple-500/40 pl-3 my-3 text-muted-foreground italic">
              {children}
            </blockquote>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3 rounded-lg border border-border/40">
              <table className="w-full text-sm">{children}</table>
            </div>
          );
        },
        th({ children }) {
          return <th className="px-3 py-2 bg-muted/30 text-left font-medium border-b border-border/30">{children}</th>;
        },
        td({ children }) {
          return <td className="px-3 py-2 border-b border-border/20">{children}</td>;
        },
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
              {children}
            </a>
          );
        },
        hr() {
          return <hr className="my-4 border-border/30" />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/* ---------- Streaming cursor ---------- */
function StreamingCursor() {
  return (
    <span className="inline-block w-[6px] h-[18px] bg-purple-400 rounded-sm ml-0.5 animate-pulse align-text-bottom" />
  );
}

/* ---------- Main component ---------- */
export default function TokenServicePlayground() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [model, setModel] = useState('claude-sonnet-4.6');
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const inputTokens = useMemo(() => countTokens(input), [input]);
  const totalTokens = useMemo(() => messages.reduce((sum, m) => sum + (m.tokens || 0), 0), [messages]);

  const isKeyValid = apiKey.startsWith('vb-sk-');
  const isAnthropicFormat = model.startsWith('claude-');

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const stopGeneration = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !isKeyValid || loading) return;
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

      const body: any = {
        model,
        messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
        ...(isAnthropicFormat ? { max_tokens: 4096 } : {}),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error?.message || err.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantText = '';
      let buffer = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '', tokens: 0 }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            // OpenAI format
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) assistantText += delta;
            // Anthropic format — only extract text_delta, skip thinking
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              assistantText += parsed.delta?.text || '';
            }
          } catch {
            // ignore
          }
        }

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

  const isStreaming = loading && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant';

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

        <div className="border-border/50 bg-card/50 backdrop-blur-sm min-h-[500px] max-h-[70vh] flex flex-col rounded-xl border">
          <div ref={chatContainerRef} className="flex-1 p-6 space-y-5 overflow-y-auto scroll-smooth">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                {t('token_service.playground_send_hint')}
              </div>
            )}
            {messages.map((msg, i) => {
              const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1;
              const showCursor = isLastAssistant && isStreaming;

              return (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''} animate-in fade-in-0 slide-in-from-bottom-2 duration-300`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-purple-400" />
                    </div>
                  )}
                  <div className={`rounded-xl text-sm ${
                    msg.role === 'user'
                      ? 'max-w-[75%] bg-purple-600/20 text-foreground px-4 py-3 whitespace-pre-wrap'
                      : 'max-w-[85%] bg-card border border-border/50 text-foreground px-4 py-3'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose-playground">
                        <MarkdownContent content={msg.content} />
                        {showCursor && <StreamingCursor />}
                      </div>
                    ) : (
                      msg.content
                    )}
                    {msg.tokens !== undefined && msg.tokens > 0 && !showCursor && (
                      <div className="text-[10px] text-muted-foreground mt-2 opacity-50">{msg.tokens} tokens</div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-1">
                      <User className="h-4 w-4 text-blue-400" />
                    </div>
                  )}
                </div>
              );
            })}
            {loading && !isStreaming && (
              <div className="flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-purple-400" />
                </div>
                <div className="bg-card border border-border/50 rounded-xl px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-1">思考中...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
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
                  disabled={loading}
                />
                {input.length > 0 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    <Hash className="h-3 w-3 inline mr-0.5" />{inputTokens} tokens
                  </div>
                )}
              </div>
              {loading ? (
                <Button
                  onClick={stopGeneration}
                  variant="outline"
                  className="shrink-0 border-red-500/50 text-red-400 hover:bg-red-500/10"
                  size="icon"
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || !isKeyValid}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 shrink-0"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
