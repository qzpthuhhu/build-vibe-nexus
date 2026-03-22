import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import AppCard from '@/components/AppCard';
import { Coins, Package, Bookmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

type Tab = 'apps' | 'favorites';

export default function Profile() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>('apps');

  const { data: myApps = [] } = useQuery({
    queryKey: ['my-apps', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('apps')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['my-favorites', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('favorites')
        .select('app_id, apps(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data?.map((f: any) => f.apps).filter(Boolean) || [];
    },
    enabled: !!user && tab === 'favorites',
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="container py-24 text-center space-y-4">
        <p className="text-muted-foreground">请先登录</p>
        <Link to="/auth"><Button className="bg-primary text-primary-foreground">去登录</Button></Link>
      </div>
    );
  }

  const items = tab === 'apps' ? myApps : favorites;

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      {/* Header */}
      <div className="animate-fade-up glass-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary shrink-0">
          {profile?.display_name?.[0] || 'U'}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{profile?.display_name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 text-sm shrink-0">
          <Coins className="h-4 w-4 text-primary" />
          <span className="font-semibold">{profile?.credits ?? 0}</span>
          <span className="text-muted-foreground">积分</span>
        </div>
      </div>

      {/* Credit History */}
      {transactions.length > 0 && (
        <div className="animate-fade-up stagger-1 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3">积分记录</h3>
          <div className="space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.description}</span>
                <span className={t.amount > 0 ? 'text-primary font-medium' : 'text-destructive'}>
                  {t.amount > 0 ? '+' : ''}{t.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setTab('apps')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === 'apps' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Package className="h-4 w-4" />
          我的应用 ({myApps.length})
        </button>
        <button
          onClick={() => setTab('favorites')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === 'favorites' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Bookmark className="h-4 w-4" />
          我的收藏
        </button>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p>{tab === 'apps' ? '还没有发布应用' : '还没有收藏'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((app: any, i: number) => (
            <AppCard key={app.id} app={app} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
