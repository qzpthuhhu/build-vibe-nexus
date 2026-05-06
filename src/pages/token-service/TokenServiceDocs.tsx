import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'claude-api', label: 'Claude API (Messages)' },
  { id: 'openai-api', label: 'OpenAI API (Chat)' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'models', label: 'Models' },
  { id: 'errors', label: 'Error Handling' },
  { id: 'rate-limits', label: 'Rate Limits' },
];

const CodeBlock = ({ code, language = 'bash' }: { code: string; language?: string }) => {
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
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="p-4 text-sm overflow-x-auto"><code className="text-muted-foreground">{code}</code></pre>
    </div>
  );
};

export default function TokenServiceDocs() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12">
        <div className="flex gap-8">
          {/* Sidebar */}
          <nav className="hidden lg:block w-56 shrink-0 sticky top-20 self-start">
            <h3 className="text-sm font-semibold text-foreground mb-4">API Reference</h3>
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
              <h1 className="text-3xl font-bold text-foreground mb-4">API Documentation</h1>
              <p className="text-muted-foreground leading-relaxed">
                VibeDir Token Service provides Claude and OpenAI-compatible API endpoints.
                Use your existing SDKs — just change the base URL and API key.
              </p>
              <div className="mt-6 p-4 rounded-lg border border-purple-500/20 bg-purple-500/5">
                <p className="text-sm text-purple-300">
                  <strong>Base URL:</strong> <code className="bg-background/50 px-2 py-0.5 rounded text-xs">https://api.vbcodingshow.com/v1</code>
                </p>
              </div>
            </section>

            <section id="authentication">
              <h2 className="text-2xl font-bold text-foreground mb-4">Authentication</h2>
              <p className="text-muted-foreground mb-4">
                All API requests require an API key passed in the <code className="text-purple-400">Authorization</code> header.
              </p>
              <CodeBlock language="bash" code={`curl https://api.vbcodingshow.com/v1/messages \\
  -H "Authorization: Bearer vb-sk-your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "claude-3-sonnet-20240229", "max_tokens": 1024, "messages": [{"role": "user", "content": "Hello!"}]}'`} />
            </section>

            <section id="claude-api">
              <h2 className="text-2xl font-bold text-foreground mb-4">Claude API — Messages</h2>
              <p className="text-muted-foreground mb-4">
                Fully compatible with Anthropic's Messages API. Use the official <code className="text-purple-400">@anthropic-ai/sdk</code> package.
              </p>
              <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Python</h3>
              <CodeBlock language="python" code={`import anthropic

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
              <CodeBlock language="typescript" code={`import Anthropic from '@anthropic-ai/sdk';

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
              <h2 className="text-2xl font-bold text-foreground mb-4">OpenAI API — Chat Completions</h2>
              <p className="text-muted-foreground mb-4">
                Also compatible with OpenAI's Chat Completions API.
              </p>
              <CodeBlock language="python" code={`from openai import OpenAI

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

              <CodeBlock language="bash" code={`curl https://api.vbcodingshow.com/v1/chat/completions \\
  -H "Authorization: Bearer vb-sk-your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'`} />
            </section>

            <section id="streaming">
              <h2 className="text-2xl font-bold text-foreground mb-4">Streaming</h2>
              <p className="text-muted-foreground mb-4">
                Both Claude and OpenAI endpoints support server-sent events (SSE) streaming.
              </p>
              <CodeBlock language="python" code={`# Claude streaming
with client.messages.stream(
    model="claude-3-sonnet-20240229",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Write a haiku."}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)`} />
            </section>

            <section id="models">
              <h2 className="text-2xl font-bold text-foreground mb-4">Supported Models</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 text-foreground font-medium">Model ID</th>
                      <th className="text-left py-3 px-4 text-foreground font-medium">Type</th>
                      <th className="text-left py-3 px-4 text-foreground font-medium">Max Context</th>
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
              <h2 className="text-2xl font-bold text-foreground mb-4">Error Handling</h2>
              <p className="text-muted-foreground mb-4">Standard HTTP status codes are returned.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 text-foreground font-medium">Code</th>
                      <th className="text-left py-3 px-4 text-foreground font-medium">Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      ['401', 'Invalid or missing API key'],
                      ['429', 'Rate limit exceeded'],
                      ['402', 'Insufficient token balance'],
                      ['500', 'Internal server error'],
                      ['503', 'Model temporarily unavailable'],
                    ].map(([code, msg]) => (
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
              <h2 className="text-2xl font-bold text-foreground mb-4">Rate Limits</h2>
              <p className="text-muted-foreground mb-4">
                Rate limits depend on your plan tier. Headers <code className="text-purple-400">X-RateLimit-Remaining</code> and <code className="text-purple-400">X-RateLimit-Reset</code> are included in every response.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
