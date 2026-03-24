import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Package, Bookmark, Pencil, Eye, Send, Undo2, Trash2, Check, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StatusBadge from '@/components/StatusBadge';
import { toast } from 'sonner';

type Tab = 'apps' | 'favorites';

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('apps');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const updateName = useMutation({
    mutationFn: async (name: string) => {
      if (!user || !profile) throw new Error('Not authenticated');
      if ((profile.credits ?? 0) < 10) throw new Error('insufficient_credits');
      // Deduct credits
      const { error: creditErr } = await supabase.from('profiles').update({ display_name: name, credits: (profile.credits ?? 0) - 10 }).eq('user_id', user.id);
      if (creditErr) throw creditErr;
      // Log transaction
      await supabase.from('credit_transactions').insert({ user_id: user.id, amount: -10, type: 'rename', description: t('profile_page.rename_cost_desc') });
    },
    onSuccess: () => {
      refreshProfile();
      setIsEditingName(false);
      toast.success(t('profile_page.rename_success'));
    },
    onError: (err: any) => {
      if (err.message === 'insufficient_credits') {
        toast.error(t('profile_page.insufficient_credits'));
      } else {
        toast.error(t('profile_page.success'));
      }
    },
  });

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

  const updateStatus = useMutation({
    mutationFn: async ({ appId, status }: { appId: string; status: string }) => {
      const update: any = { status };
      if (status === 'pending') update.submitted_at = new Date().toISOString();
      const { error } = await supabase.from('apps').update(update).eq('id', appId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-apps'] });
      toast.success(t('profile_page.success'));
    },
  });

  const deleteApp = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase.from('apps').delete().eq('id', appId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-apps'] });
      toast.success(t('profile_page.deleted'));
    },
  });

  if (!user) {
    return (
      <div className="container py-24 text-center space-y-4">
        <p className="text-muted-foreground">{t('profile_page.please_login')}</p>
        <Link to="/auth"><Button className="bg-primary text-primary-foreground">{t('profile_page.go_login')}</Button></Link>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      {/* Header */}
      <div className="animate-fade-up glass-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary shrink-0">
          {profile?.display_name?.[0] || 'U'}
        </div>
        <div className="flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 w-48 text-sm"
                maxLength={20}
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary"
                disabled={!newName.trim() || newName.trim() === profile?.display_name || updateName.isPending}
                onClick={() => updateName.mutate(newName.trim())}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditingName(false)}>
                <X className="h-4 w-4" />
              </Button>
              <span className="text-[10px] text-muted-foreground">-10 {t('profile_page.credits')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{profile?.display_name}</h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => { setNewName(profile?.display_name || ''); setIsEditingName(true); }}
                title={t('profile_page.edit_name')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 text-sm shrink-0">
          <Coins className="h-4 w-4 text-primary" />
          <span className="font-semibold">{profile?.credits ?? 0}</span>
          <span className="text-muted-foreground">{t('profile_page.credits')}</span>
        </div>
      </div>

      {/* Credit History */}
      {transactions.length > 0 && (
        <div className="animate-fade-up stagger-1 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3">{t('profile_page.credit_history')}</h3>
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{tx.description}</span>
                <span className={tx.amount > 0 ? 'text-primary font-medium' : 'text-destructive'}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
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
          {t('profile_page.my_apps')} ({myApps.length})
        </button>
        <button
          onClick={() => setTab('favorites')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === 'favorites' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Bookmark className="h-4 w-4" />
          {t('profile_page.my_favorites')}
        </button>
      </div>

      {/* My Apps with management */}
      {tab === 'apps' && (
        <div className="space-y-3">
          {myApps.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p>{t('profile_page.no_apps')}</p>
            </div>
          ) : (
            myApps.map((app: any, i: number) => (
              <div key={app.id} className={`glass-card p-4 animate-fade-up stagger-${Math.min(i % 4, 4)}`}>
                <div className="flex items-start gap-4">
                  <div className="w-20 h-14 rounded-lg overflow-hidden bg-secondary shrink-0">
                    {app.cover_image ? (
                      <img src={app.cover_image} alt={app.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-primary/30 font-bold">{app.title[0]}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold truncate">{app.title}</h3>
                      <StatusBadge status={app.status} />
                      {app.is_for_sale && (
                        <span className="text-[10px] px-1.5 py-0 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">{t('profile_page.for_sale')}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{app.description}</p>
                    {app.rejection_reason && app.status === 'rejected' && (
                      <p className="text-xs text-destructive mt-1">{t('profile_page.reject_reason')}：{app.rejection_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/app/${app.id}`)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/submit/${app.id}`)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {(app.status === 'draft' || app.status === 'rejected') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={() => updateStatus.mutate({ appId: app.id, status: 'pending' })}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {app.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-400"
                        onClick={() => updateStatus.mutate({ appId: app.id, status: 'draft' })}
                        title={t('profile_page.withdraw_review')}
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {app.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteApp.mutate(app.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Favorites tab */}
      {tab === 'favorites' && (
        favorites.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>{t('profile_page.no_favorites')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((app: any, i: number) => (
              <Link key={app.id} to={`/app/${app.id}`} className={`glass-card hover-lift overflow-hidden animate-fade-up stagger-${Math.min(i % 4, 4)}`}>
                <div className="aspect-[16/10] bg-secondary">
                  {app.cover_image ? (
                    <img src={app.cover_image} alt={app.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-primary/30 text-2xl font-bold">{app.title?.[0]}</div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold truncate">{app.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{app.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
