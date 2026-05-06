import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Loader2, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

export default function TokenServicePlayground() {
  const { t } = useTranslation();
  const [model, setModel] = useState('claude-sonnet-4-6');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const inputTokens = useMemo(() => countTokens(input), [input]);
  const totalTokens = useMemo(() => messages.reduce((sum, m) => sum + (m.tokens || 0), 0), [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const tokens = countTokens(input);
    const userMsg: Message = { role: 'user', content: input, tokens };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const responseText = `${t('token_service.playground_simulated', { model })} "${userMsg.content}"`;
      const responseTokens = countTokens(responseText);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: responseText, tokens: responseTokens },
      ]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('token_service.playground_title')}</h1>
            <p className="text-sm text-muted-foreground">{t('token_service.playground_subtitle')}</p>
          </div>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-64 bg-card border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude-opus-4-7">Claude Opus 4.7</SelectItem>
              <SelectItem value="claude-sonnet-4-6">Claude Sonnet 4.6</SelectItem>
              <SelectItem value="claude-haiku-4-5">Claude Haiku 4.5</SelectItem>
              <SelectItem value="gpt-5.5">GPT-5.5</SelectItem>
              <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
              <SelectItem value="gpt-5.4-mini">GPT-5.4 Mini</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
                <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-purple-600/20 text-foreground'
                    : 'bg-card border border-border/50 text-foreground'
                }`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-blue-400" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
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
            <div className="flex gap-3">
              <Textarea
                placeholder={t('token_service.playground_input_placeholder')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                className="resize-none bg-background border-border/50 min-h-[44px] max-h-32"
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
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
