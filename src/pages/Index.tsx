import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AppCard from '@/components/AppCard';
import { Flame, Clock, ShoppingBag, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Tab = 'hot' | 'new' | 'for_sale';

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('hot');
  const [search, setSearch] = useState('');
  const { t } = useTranslation();

  const tabs: { key: Tab; label: string; icon: typeof Flame }[] = [
    { key: 'hot', label: t('tabs.hot'), icon: Flame },
    { key: 'new', label: t('tabs.new'), icon: Clock },
    { key: 'for_sale', label: t('tabs.for_sale'), icon: ShoppingBag },
  ];

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['apps', activeTab, search],
    queryFn: async () => {
      let query = supabase
        .from('apps')
        .select('*')
        .eq('status', 'approved');

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (activeTab === 'hot') {
        query = query.order('likes_count', { ascending: false });
      } else if (activeTab === 'new') {
        query = query.order('created_at', { ascending: false });
      } else if (activeTab === 'for_sale') {
        query = (query as any).eq('is_for_sale', true).order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(30);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-[0.07] blur-[120px]"
          style={{ background: 'linear-gradient(135deg, hsl(142 72% 46%), hsl(271 81% 56%), hsl(330 81% 60%))' }}
        />
        <div className="container relative py-20 md:py-28 text-center space-y-7">
          <p className="text-sm md:text-base text-muted-foreground font-medium tracking-widest uppercase animate-fade-up">
            {t('hero.tagline')}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.08] animate-fade-up stagger-1">
            {t('hero.title_prefix')}
            <span className="text-gradient">{t('hero.title_highlight')}</span>
          </h1>
          <p className="mx-auto max-w-xl text-base md:text-lg text-foreground/80 font-medium animate-fade-up stagger-2">
            {t('hero.subtitle')}
          </p>
          <p className="mx-auto max-w-xl text-xs md:text-sm text-muted-foreground animate-fade-up stagger-3">
            {t('hero.platform_tagline')}
          </p>
          <div className="mx-auto max-w-md relative animate-fade-up stagger-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('hero.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border/50 h-11"
            />
          </div>
        </div>
      </section>

      {/* Tabs & Feed */}
      <section className="container py-8">
        <div className="flex items-center gap-1 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass-card overflow-hidden animate-pulse">
                <div className="aspect-[16/10] bg-secondary" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-secondary" />
                  <div className="h-3 w-full rounded bg-secondary" />
                  <div className="h-3 w-2/3 rounded bg-secondary" />
                </div>
              </div>
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground animate-fade-up">
            <p className="text-lg">{t('index.no_apps')}</p>
            <p className="text-sm mt-1">{t('index.be_first')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {apps.map((app, i) => (
              <AppCard key={app.id} app={app} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
