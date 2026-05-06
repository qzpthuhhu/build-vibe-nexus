import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const CodeBlock = ({ code, language = 'bash', t }: { code: string; language?: string; t: (k: string) => string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-lg border border-border/50 bg-background/80 overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/30">
        <span className="text-xs text-muted-foreground">{language}</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-xs gap-1.5">
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? t('token_service.docs_copied') : t('token_service.docs_copy')}
        </Button>
      </div>
      <pre className="p-4 text-sm overflow-x-auto"><code className="text-muted-foreground">{code}</code></pre>
    </div>
  );
};

export default function TokenServiceDocs() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', label: t('token_service.docs_overview') },
    { id: 'authentication', label: t('token_service.docs_auth') },
    { id: 'claude-api', label: t('token_service.docs_claude_api') },
    { id: 'openai-api', label: t('token_service.docs_openai_api') },
    { id: 'streaming', label: t('token_service.docs_streaming') },
    { id: 'models', label: t('token_service.docs_models') },
    { id: 'errors', label: t('token_service.docs_errors') },
    { id: 'rate-limits', label: t('token_service.docs_rate_limits') },
  ];

  const errorCodes: [string, string][] = [
    ['401', t('token_service.docs_error_401')],
    ['429', t('token_service.docs_error_429')],
    ['402', t('token_service.docs_error_402')],
    ['500', t('token_service.docs_error_500')],
    ['503', t('token_service.docs_error_503')],
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12">
        <div className="flex gap-8">
          {/* Sidebar */}
          <nav className="hidden lg:block w-56 shrink-0 sticky top-20 self-start">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t('token_service.docs_api_ref')}</h3>
            <ul className="space-y-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={() => setActiveSection(s.id)}
                    className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${
                      activeSection === s.id
                        ? 'text-purple-400 bg-purple-500/10'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 max-w-3xl space-y-16">
            <section id="overview">
              <h1 className="text-3xl font-bold text-foreground mb-4">{t('token_service.docs_title')}</h1>
              <p className="text-muted-foreground leading-relaxed">
                {t('token_service.docs_overview_text')}
              </p>
              <div className="mt-6 p-4 rounded-lg border border-purple-500/20 bg-purple-500/5">
                <p className="text-sm text-purple-300">
                  <strong>Base URL:</strong> <code className="bg-background/50 px-2 py-0.5 rounded text-xs">https://api.vbcodingshow.com/v1</code>
                </p>
              </div>
            </section>

            <section id="authentication">
              <h2 className="text-2xl font-bold text-foreground mb-4">{t('token_service.docs_auth_title')}</h2>
              <p className="text-muted-foreground mb-4">
                {t('token_service.docs_auth_text')}
              </p>
              <CodeBlock t={t} language="bash" code={`curl https://api.vbcodingshow.com/v1/messages \\
  -H "Authorization: Bearer vb-sk-your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "claude-3-sonnet-20240229", "max_tokens": 1024, "messages": [{"role": "user", "content": "Hello!"}]}'`} />
            </section>

            <section id="claude-api">
              <h2 className="text-2xl font-bold text-foreground mb-4">{t('token_service.docs_claude_title')}</h2>
              <p className="text-muted-foreground mb-4">
                {t('token_service.docs_claude_text')}
              </p>
              <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Python</h3>
              <CodeBlock t={t} language="python" code={`import anthropic

client = anthropic.Anthropic(
    api_key="vb-sk-your-api-key",
    base_url="https://api.vbcodingshow.com/v1"
)

message = client.messages.create(
    model="claude-3-sonnet-20240229",
    max_tokens=1024,
    system="You are a helpful assistant.",
    messages=[
        {"role": "user", "content": "Explain quantum computing in simple terms."}
    ]
)
print(message.content[0].text)`} />

              <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Node.js</h3>
              <CodeBlock t={t} language="typescript" code={`import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: 'vb-sk-your-api-key',
  baseURL: 'https://api.vbcodingshow.com/v1'
});

const message = await client.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: 'Hello, Claude!' }
  ]
});

console.log(message.content[0].text);`} />
            </section>

            <section id="openai-api">
              <h2 className="text-2xl font-bold text-foreground mb-4">{t('token_service.docs_openai_title')}</h2>
              <p className="text-muted-foreground mb-4">
                {t('token_service.docs_openai_text')}
              </p>
              <CodeBlock t={t} language="python" code={`from openai import OpenAI

client = OpenAI(
    api_key="vb-sk-your-api-key",
    base_url="https://api.vbcodingshow.com/v1"
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)`} />

              <CodeBlock t={t} language="bash" code={`curl https://api.vbcodingshow.com/v1/chat/completions \\
  -H "Authorization: Bearer vb-sk-your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'`} />
            </section>

            <section id="streaming">
              <h2 className="text-2xl font-bold text-foreground mb-4">{t('token_service.docs_streaming_title')}</h2>
              <p className="text-muted-foreground mb-4">
                {t('token_service.docs_streaming_text')}
              </p>
              <CodeBlock t={t} language="python" code={`# Claude streaming
with client.messages.stream(
    model="claude-3-sonnet-20240229",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Write a haiku."}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)`} />
            </section>

            <section id="models">
              <h2 className="text-2xl font-bold text-foreground mb-4">{t('token_service.docs_models_title')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 text-foreground font-medium">{t('token_service.docs_model_id')}</th>
                      <th className="text-left py-3 px-4 text-foreground font-medium">{t('token_service.docs_model_type')}</th>
                      <th className="text-left py-3 px-4 text-foreground font-medium">{t('token_service.docs_model_context')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      ['claude-3-opus-20240229', 'Claude', '200K'],
                      ['claude-3-sonnet-20240229', 'Claude', '200K'],
                      ['claude-3-haiku-20240307', 'Claude', '200K'],
                      ['gpt-4', 'OpenAI', '128K'],
                      ['gpt-4-turbo', 'OpenAI', '128K'],
                      ['gpt-3.5-turbo', 'OpenAI', '16K'],
                    ].map(([model, type, ctx]) => (
                      <tr key={model} className="border-b border-border/30">
                        <td className="py-3 px-4 font-mono text-purple-400">{model}</td>
                        <td className="py-3 px-4">{type}</td>
                        <td className="py-3 px-4">{ctx}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="errors">
              <h2 className="text-2xl font-bold text-foreground mb-4">{t('token_service.docs_errors_title')}</h2>
              <p className="text-muted-foreground mb-4">{t('token_service.docs_errors_text')}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 text-foreground font-medium">{t('token_service.docs_error_code')}</th>
                      <th className="text-left py-3 px-4 text-foreground font-medium">{t('token_service.docs_error_meaning')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {errorCodes.map(([code, msg]) => (
                      <tr key={code} className="border-b border-border/30">
                        <td className="py-3 px-4 font-mono text-red-400">{code}</td>
                        <td className="py-3 px-4">{msg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="rate-limits">
              <h2 className="text-2xl font-bold text-foreground mb-4">{t('token_service.docs_rate_limits_title')}</h2>
              <p className="text-muted-foreground mb-4">
                {t('token_service.docs_rate_limits_text')}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
