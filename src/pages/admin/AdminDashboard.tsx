import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useAdmin } from '@/hooks/use-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '@/components/StatusBadge';
import {
  Shield, Users, BarChart3, CheckCircle, XCircle, Ban,
  ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

type AdminTab = 'review' | 'users' | 'stats';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useAdmin();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminTab>('review');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: apps = [] } = useQuery({
    queryKey: ['admin-apps', statusFilter],
    queryFn: async () => {
      let query = supabase.from('apps').select('*') as any;
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data: appsData } = await query.order('created_at', { ascending: false }).limit(50);
      if (!appsData || appsData.length === 0) return [];
      // Fetch profile display names for all user_ids
      const userIds = [...new Set(appsData.map((a: any) => a.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name').in('user_id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name]));
      return appsData.map((a: any) => ({ ...a, profile_display_name: profileMap[a.user_id] || null }));
    },
    enabled: isAdmin,
  });

  const { data: userList = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!profilesData || profilesData.length === 0) return [];
      const userIds = profilesData.map((p: any) => p.user_id);
      const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
      const roleMap: Record<string, any[]> = {};
      (roles || []).forEach((r: any) => { (roleMap[r.user_id] = roleMap[r.user_id] || []).push(r); });
      return profilesData.map((p: any) => ({ ...p, user_roles: roleMap[p.user_id] || [] }));
    },
    enabled: isAdmin && tab === 'users',
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [apps, users, pending] = await Promise.all([
        supabase.from('apps').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('apps').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      return {
        totalApps: apps.count || 0,
        totalUsers: users.count || 0,
        pendingReview: pending.count || 0,
      };
    },
    enabled: isAdmin && tab === 'stats',
  });

  const reviewAction = useMutation({
    mutationFn: async ({ appId, action, note, reason }: { appId: string; action: string; note?: string; reason?: string }) => {
      const update: any = { review_note: note || null };
      if (action === 'approve') {
        update.status = 'approved';
        update.approved_at = new Date().toISOString();
      } else if (action === 'reject') {
        update.status = 'rejected';
        update.rejection_reason = reason || null;
      } else if (action === 'offline') {
        update.status = 'offline';
      }
      const { error } = await supabase.from('apps').update(update).eq('id', appId);
      if (error) throw error;
      // Log review action
      await supabase.from('app_review_logs').insert({
        app_id: appId,
        action,
        operator_id: user!.id,
        note: note || reason || null,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-apps'] });
      setExpandedApp(null);
      setReviewNote('');
      setRejectionReason('');
      toast.success('操作成功');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteApp = useMutation({
    mutationFn: async (appId: string) => {
      await supabase.from('app_review_logs').insert({
        app_id: appId,
        action: 'delete',
        operator_id: user!.id,
        note: '管理员删除',
      } as any);
      const { error } = await supabase.from('apps').delete().eq('id', appId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-apps'] });
      toast.success('已删除');
    },
  });

  if (roleLoading) return <div className="container py-24 text-center text-muted-foreground">加载中...</div>;
  if (!isAdmin) {
    return (
      <div className="container py-24 text-center text-muted-foreground space-y-2">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground/30" />
        <p>无权访问管理后台</p>
      </div>
    );
  }

  const STATUS_FILTERS = [
    { value: 'pending', label: '待审核' },
    { value: 'approved', label: '已通过' },
    { value: 'rejected', label: '已打回' },
    { value: 'draft', label: '草稿' },
    { value: 'offline', label: '已下线' },
    { value: 'all', label: '全部' },
  ];

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center gap-2 animate-fade-up">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">管理后台</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 animate-fade-up stagger-1">
        {([
          { key: 'review' as AdminTab, label: '应用审核', icon: CheckCircle },
          { key: 'users' as AdminTab, label: '用户管理', icon: Users },
          { key: 'stats' as AdminTab, label: '内容统计', icon: BarChart3 },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Review Tab */}
      {tab === 'review' && (
        <div className="space-y-4 animate-fade-up stagger-2">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  statusFilter === f.value ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {apps.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暂无数据</p>
          ) : (
            <div className="space-y-3">
              {apps.map((app: any) => (
                <div key={app.id} className="glass-card overflow-hidden">
                  <div className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold truncate">{app.title}</span>
                        <StatusBadge status={app.status} />
                        {app.is_for_sale && <span className="text-[10px] px-1.5 rounded bg-emerald-500/10 text-emerald-400">出售</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>提交者：{app.profiles?.display_name || '未知'}</span>
                        <span>阶段：{app.monetization_stage || '未设置'}</span>
                        <span>{new Date(app.created_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link to={`/app/${app.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                      >
                        {expandedApp === app.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {expandedApp === app.id && (
                    <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
                      <div className="space-y-2">
                        <Textarea
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="审核备注（可选）"
                          className="text-xs min-h-[60px] bg-secondary/50 border-border/50 resize-none"
                        />
                        {app.status !== 'rejected' && (
                          <Input
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="驳回原因（打回时必填）"
                            className="text-xs bg-secondary/50 border-border/50"
                          />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => reviewAction.mutate({ appId: app.id, action: 'approve', note: reviewNote })}
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> 通过
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-amber-400 border-amber-500/30"
                          onClick={() => {
                            if (!rejectionReason.trim()) { toast.error('请填写驳回原因'); return; }
                            reviewAction.mutate({ appId: app.id, action: 'reject', note: reviewNote, reason: rejectionReason });
                          }}
                        >
                          <XCircle className="h-3.5 w-3.5" /> 打回
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => reviewAction.mutate({ appId: app.id, action: 'offline', note: reviewNote })}
                        >
                          <Ban className="h-3.5 w-3.5" /> 下线
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteApp.mutate(app.id)}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="space-y-3 animate-fade-up stagger-2">
          {userList.map((u: any) => (
            <div key={u.id} className="glass-card p-4 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary shrink-0">
                {u.display_name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{u.display_name || '未命名'}</div>
                <div className="text-xs text-muted-foreground">{u.username || u.user_id?.slice(0, 8)}</div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0">
                {u.credits} 积分
              </div>
              <div className="text-xs shrink-0">
                {u.user_roles?.map((r: any) => (
                  <span key={r.role} className="rounded bg-primary/10 text-primary px-1.5 py-0.5 ml-1">{r.role}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Tab */}
      {tab === 'stats' && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-up stagger-2">
          {[
            { label: '总应用数', value: stats.totalApps, color: 'text-primary' },
            { label: '总用户数', value: stats.totalUsers, color: 'text-emerald-400' },
            { label: '待审核', value: stats.pendingReview, color: 'text-amber-400' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-6 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
