import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    tokens: '10,000',
    description: 'Perfect for testing and prototyping',
    features: [
      '10,000 tokens / month',
      '10 RPM',
      '100K TPM',
      '4K context window',
      'Claude 3 Haiku compatible',
      'Community support',
    ],
    cta: 'Start Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/ month',
    tokens: '2,000,000',
    description: 'For individual developers and small projects',
    features: [
      '2M tokens / month',
      '60 RPM',
      '1M TPM',
      '32K context window',
      'All Claude 3 models',
      'Streaming support',
      'Priority queue',
      'Email support',
    ],
    cta: 'Get Pro',
    highlight: true,
  },
  {
    name: 'Team',
    price: '$99',
    period: '/ month',
    tokens: '10,000,000',
    description: 'For teams building production applications',
    features: [
      '10M tokens / month',
      '120 RPM',
      '5M TPM',
      '128K context window',
      'All models + early access',
      'Function calling',
      'Dedicated queue',
      'Slack support',
      'Usage analytics',
    ],
    cta: 'Get Team',
    highlight: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    tokens: 'Unlimited',
    description: 'For high-volume production workloads',
    features: [
      'Unlimited tokens',
      'Custom RPM/TPM',
      '200K context window',
      'Custom model routing',
      'SLA guarantee',
      'Dedicated support',
      'IP allowlisting',
      'SSO & RBAC',
      'Custom billing',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
];

export default function TokenServicePricing() {
  return (
    <div className="min-h-screen bg-background py-20">
      <div className="container">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground mt-4 max-w-lg mx-auto">
            Pay only for what you use. Scale from prototype to production with predictable costs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border p-6 transition-all duration-300 ${
                plan.highlight
                  ? 'border-purple-500/50 bg-gradient-to-b from-purple-500/5 to-transparent shadow-lg shadow-purple-500/5'
                  : 'border-border/50 bg-card/50 hover:border-border'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-medium">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground ml-1">{plan.period}</span>
              </div>
              <div className="text-sm text-muted-foreground mb-6">
                <span className="text-foreground font-medium">{plan.tokens}</span> tokens included
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to={plan.name === 'Enterprise' ? '/contact' : '/token-service/dashboard'}>
                <Button
                  className={`w-full ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0'
                      : ''
                  }`}
                  variant={plan.highlight ? 'default' : 'outline'}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-24">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              { q: 'How does token counting work?', a: 'We count both prompt and completion tokens, matching the official Claude/OpenAI token counting. Your dashboard shows real-time usage.' },
              { q: 'Can I switch plans anytime?', a: 'Yes, you can upgrade or downgrade at any time. Changes take effect immediately and billing is prorated.' },
              { q: 'What models are supported?', a: 'We support Claude 3 Opus, Sonnet, and Haiku, as well as OpenAI GPT-4 and GPT-3.5 compatible endpoints.' },
              { q: 'Is there an overage fee?', a: 'When you exceed your plan limits, requests are throttled rather than charged extra. Upgrade your plan for higher limits.' },
            ].map(({ q, a }) => (
              <div key={q} className="p-4 rounded-lg border border-border/50 bg-card/30">
                <h3 className="font-medium text-foreground">{q}</h3>
                <p className="text-sm text-muted-foreground mt-2">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
