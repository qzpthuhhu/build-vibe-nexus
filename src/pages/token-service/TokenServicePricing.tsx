import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TokenPackage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  token_amount: number;
  rpm_limit: number;
  tpm_limit: number;
  max_context: number;
  features: string[];
  sort_order: number;
}

export default function TokenServicePricing() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('token_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setPackages((data as any[]) || []);
      });
  }, []);

  const handlePurchase = async (pkg: TokenPackage) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (pkg.price_cents === 0) {
      // Free tier: just give tokens
      await supabase.from('token_balances').upsert(
        { user_id: user.id, total_balance: pkg.token_amount, used_balance: 0 },
        { onConflict: 'user_id' }
      );
      toast.success('已激活免费额度！');
      navigate('/token-service/dashboard');
      return;
    }

    setPurchasing(pkg.id);
    // Create pending order
    const { error } = await supabase.from('token_orders').insert({
      user_id: user.id,
      package_id: pkg.id,
      amount_cents: pkg.price_cents,
      token_amount: pkg.token_amount,
      status: 'pending',
      payment_method: 'manual',
    });

    setPurchasing(null);
    if (error) {
      toast.error('创建订单失败');
      return;
    }
    toast.success('订单已创建，请联系管理员确认付款');
    navigate('/token-service/dashboard');
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return '¥0';
    return `¥${(cents / 100).toFixed(0)}`;
  };

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

        <div className={`grid md:grid-cols-2 ${packages.length >= 3 ? 'lg:grid-cols-3' : ''} gap-6 max-w-5xl mx-auto`}>
          {packages.map((pkg, i) => {
            const isHighlight = i === 1;
            return (
              <div
                key={pkg.id}
                className={`relative flex flex-col rounded-xl border p-6 transition-all duration-300 ${
                  isHighlight
                    ? 'border-purple-500/50 bg-gradient-to-b from-purple-500/5 to-transparent shadow-lg shadow-purple-500/5'
                    : 'border-border/50 bg-card/50 hover:border-border'
                }`}
              >
                {isHighlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-medium">
                    {t('token_service.pricing_most_popular')}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">{formatPrice(pkg.price_cents)}</span>
                </div>
                <div className="text-sm text-muted-foreground mb-6">
                  <span className="text-foreground font-medium">{pkg.token_amount.toLocaleString()}</span> Tokens
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {(pkg.features || []).map((f: string) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    isHighlight
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0'
                      : ''
                  }`}
                  variant={isHighlight ? 'default' : 'outline'}
                  disabled={purchasing === pkg.id}
                  onClick={() => handlePurchase(pkg)}
                >
                  {purchasing === pkg.id ? '处理中...' : pkg.price_cents === 0 ? '免费开始' : `购买 ${formatPrice(pkg.price_cents)}`}
                </Button>
              </div>
            );
          })}
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
