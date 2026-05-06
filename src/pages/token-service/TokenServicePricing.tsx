import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function TokenServicePricing() {
  const { t } = useTranslation();

  const plans = [
    {
      nameKey: 'pricing_free', price: '$0', periodKey: 'pricing_forever', tokens: '10,000',
      descKey: 'pricing_free_desc',
      features: ['10,000 tokens / month', '10 RPM', '100K TPM', '4K context window', 'Claude Haiku 4.5 compatible', 'Community support'],
      ctaKey: 'pricing_start_free', highlight: false,
    },
    {
      nameKey: 'pricing_pro', price: '$29', periodKey: 'pricing_month', tokens: '2,000,000',
      descKey: 'pricing_pro_desc',
      features: ['2M tokens / month', '60 RPM', '1M TPM', '200K context window', 'All Claude & GPT models', 'Streaming support', 'Priority queue', 'Email support'],
      ctaKey: 'pricing_get_pro', highlight: true,
    },
    {
      nameKey: 'pricing_team', price: '$99', periodKey: 'pricing_month', tokens: '10,000,000',
      descKey: 'pricing_team_desc',
      features: ['10M tokens / month', '120 RPM', '5M TPM', '128K context window', 'All models + early access', 'Function calling', 'Dedicated queue', 'Slack support', 'Usage analytics'],
      ctaKey: 'pricing_get_team', highlight: false,
    },
    {
      nameKey: 'pricing_enterprise', price: t('token_service.pricing_custom'), periodKey: '', tokens: t('token_service.pricing_unlimited'),
      descKey: 'pricing_enterprise_desc',
      features: ['Unlimited tokens', 'Custom RPM/TPM', '200K context window', 'Custom model routing', 'SLA guarantee', 'Dedicated support', 'IP allowlisting', 'SSO & RBAC', 'Custom billing'],
      ctaKey: 'pricing_contact_sales', highlight: false,
    },
  ];

  const faqs = [
    { qKey: 'pricing_faq_q1', aKey: 'pricing_faq_a1' },
    { qKey: 'pricing_faq_q2', aKey: 'pricing_faq_a2' },
    { qKey: 'pricing_faq_q3', aKey: 'pricing_faq_a3' },
    { qKey: 'pricing_faq_q4', aKey: 'pricing_faq_a4' },
  ];

  return (
    <div className="min-h-screen bg-background py-20">
      <div className="container">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground">{t('token_service.pricing_title')}</h1>
          <p className="text-muted-foreground mt-4 max-w-lg mx-auto">
            {t('token_service.pricing_subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.nameKey}
              className={`relative flex flex-col rounded-xl border p-6 transition-all duration-300 ${
                plan.highlight
                  ? 'border-purple-500/50 bg-gradient-to-b from-purple-500/5 to-transparent shadow-lg shadow-purple-500/5'
                  : 'border-border/50 bg-card/50 hover:border-border'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-medium">
                  {t('token_service.pricing_most_popular')}
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">{t(`token_service.${plan.nameKey}`)}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t(`token_service.${plan.descKey}`)}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                {plan.periodKey && <span className="text-muted-foreground ml-1">{t(`token_service.${plan.periodKey}`)}</span>}
              </div>
              <div className="text-sm text-muted-foreground mb-6">
                <span className="text-foreground font-medium">{plan.tokens}</span> {t('token_service.pricing_tokens_included')}
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to={plan.nameKey === 'pricing_enterprise' ? '/contact' : '/token-service/dashboard'}>
                <Button
                  className={`w-full ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0'
                      : ''
                  }`}
                  variant={plan.highlight ? 'default' : 'outline'}
                >
                  {t(`token_service.${plan.ctaKey}`)}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-24">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">{t('token_service.pricing_faq_title')}</h2>
          <div className="space-y-6">
            {faqs.map(({ qKey, aKey }) => (
              <div key={qKey} className="p-4 rounded-lg border border-border/50 bg-card/30">
                <h3 className="font-medium text-foreground">{t(`token_service.${qKey}`)}</h3>
                <p className="text-sm text-muted-foreground mt-2">{t(`token_service.${aKey}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
