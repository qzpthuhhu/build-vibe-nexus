import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Shield, Globe, Code, BarChart3, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const codeExample = `import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: 'vb-sk-your-api-key',
  baseURL: 'https://api.vbcodingshow.com/v1'
});

const message = await client.messages.create({
  model: 'claude-opus-4-7',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: 'Hello, Claude!' }
  ]
});

console.log(message.content);`;

export default function TokenServiceHome() {
  const { t } = useTranslation();

  const features = [
    { icon: Code, title: t('token_service.home_feat_compatible_title'), desc: t('token_service.home_feat_compatible_desc') },
    { icon: Zap, title: t('token_service.home_feat_latency_title'), desc: t('token_service.home_feat_latency_desc') },
    { icon: Shield, title: t('token_service.home_feat_security_title'), desc: t('token_service.home_feat_security_desc') },
    { icon: Globe, title: t('token_service.home_feat_routing_title'), desc: t('token_service.home_feat_routing_desc') },
    { icon: BarChart3, title: t('token_service.home_feat_analytics_title'), desc: t('token_service.home_feat_analytics_desc') },
    { icon: Key, title: t('token_service.home_feat_keys_title'), desc: t('token_service.home_feat_keys_desc') },
  ];

  const stats = [
    { value: '99.9%', label: t('token_service.home_uptime') },
    { value: '<100ms', label: t('token_service.home_overhead') },
    { value: '10M+', label: t('token_service.home_tokens_day') },
    { value: '5+', label: t('token_service.home_providers') },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(260,60%,15%)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(220,60%,12%)_0%,transparent_50%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-purple-500/5 to-transparent rounded-full blur-3xl" />
        
        <div className="container relative z-10 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-400 text-sm">
                <Zap className="h-3.5 w-3.5" />
                {t('token_service.home_badge')}
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                <span className="text-foreground">{t('token_service.home_title_1')}</span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  {t('token_service.home_title_2')}
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                {t('token_service.home_subtitle')}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/token-service/dashboard">
                  <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 gap-2">
                    {t('token_service.home_start_building')} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/token-service/api-keys">
                  <Button size="lg" variant="outline" className="border-purple-500/30 hover:bg-purple-500/10">
                    {t('token_service.home_get_api_key')}
                  </Button>
                </Link>
                <Link to="/token-service/docs">
                  <Button size="lg" variant="ghost" className="text-muted-foreground hover:text-foreground">
                    {t('token_service.home_view_docs')}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Code preview */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl blur-xl" />
              <div className="relative rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-background/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">example.ts</span>
                </div>
                <pre className="p-4 text-sm overflow-x-auto">
                  <code className="text-muted-foreground">
                    {codeExample.split('\n').map((line, i) => (
                      <div key={i} className="leading-6">
                        <span className="text-muted-foreground/40 select-none mr-4 text-xs">{String(i + 1).padStart(2)}</span>
                        <span className={
                          line.includes('import') || line.includes('from') || line.includes('const') || line.includes('await')
                            ? 'text-purple-400'
                            : line.includes("'") || line.includes('"')
                              ? 'text-cyan-400'
                              : line.includes('//') ? 'text-muted-foreground/60' : 'text-foreground/80'
                        }>{line}</span>
                      </div>
                    ))}
                  </code>
                </pre>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 pt-12 border-t border-border/30">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">{t('token_service.home_features_title')}</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              {t('token_service.home_features_subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="group p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-purple-500/30 hover:bg-card/80 transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                  <f.icon className="h-5 w-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border/30">
        <div className="container text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold text-foreground">{t('token_service.home_cta_title')}</h2>
            <p className="text-muted-foreground">
              {t('token_service.home_cta_subtitle')}
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/token-service/api-keys">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 gap-2">
                  {t('token_service.home_get_started')} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/token-service/pricing">
                <Button size="lg" variant="outline" className="border-purple-500/30">
                  {t('token_service.home_view_pricing')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
