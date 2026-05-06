import { useState, useRef, useCallback } from 'react';
import { inferCategory } from '@/lib/categories';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useAdmin } from '@/hooks/use-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import StatusBadge from '@/components/StatusBadge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Shield, Users, BarChart3, CheckCircle, XCircle, Ban,
  ExternalLink, ChevronDown, ChevronUp, Upload, Loader2, Trash2, RotateCcw, Globe,
  Search, ChevronLeft, ChevronRight, AlertTriangle, ListChecks
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ensureHttpUrl } from '@/lib/url';
import { sendTransactionalEmail, getSiteUrl } from '@/lib/email';
import MediaGallery from '@/components/MediaGallery';
import AdminReviewPanel from '@/components/admin/AdminReviewPanel';
import AdminProvidersPanel from '@/components/admin/AdminProvidersPanel';
import AdminOrdersPanel from '@/components/admin/AdminOrdersPanel';

type AdminTab = 'review' | 'users' | 'stats' | 'batch' | 'providers' | 'orders';

interface BatchItem {
  url: string;
  status: 'pending' | 'parsing' | 'success' | 'error' | 'duplicate';
  error?: string;
  title?: string;
  appId?: string;
  duplicateAppId?: string;
}

const PAGE_SIZE = 20;

export default function AdminDashboard() {
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useAdmin();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminTab>('review');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Search & pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Bulk selection state
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);

  // Batch submission state
  const [batchUrls, setBatchUrls] = useState('');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const batchAbortRef = useRef(false);

  // Normalize URL for comparison (strip protocol, trailing slash, www.)
  const normalizeUrl = useCallback((url: string) => {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '') + u.search;
    } catch {
      return url.trim().toLowerCase();
    }
  }, []);

  const parseSingleUrl = useCallback(async (url: string): Promise<{ title: string; description: string; tags: string[]; platform: string | null; screenshotBase64: string | null }> => {
    const { data, error } = await supabase.functions.invoke('parse-url', {
      body: { url: url.trim() },
    });
    if (error || !data?.success) throw new Error(data?.error || 'Parse failed');
    return data.data;
  }, []);

  const uploadScreenshot = useCallback(async (base64Data: string, userId: string): Promise<string | null> => {
    try {
      const mimeMatch = base64Data.match(/^data:(image\/\w+);base64,/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const ext = mime === 'image/jpeg' ? 'jpg' : 'png';
      const raw = atob(base64Data.replace(/^data:image\/\w+;base64,/, ''));
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const fileName = `${userId}/${Date.now()}-screenshot.${ext}`;
      const { error } = await supabase.storage.from('app-media').upload(fileName, blob, { contentType: mime, upsert: true });
      if (error) return null;
      const { data: urlData } = supabase.storage.from('app-media').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch { return null; }
  }, []);

  // Check for duplicate URLs in existing apps
  const checkDuplicateUrl = useCallback(async (url: string): Promise<{ isDuplicate: boolean; appId?: string; status?: string }> => {
    const normalized = normalizeUrl(url);
    // Fetch all apps to check URL similarity
    const { data: existingApps } = await supabase
      .from('apps')
      .select('id, url, status')
      .limit(1000);
    if (!existingApps) return { isDuplicate: false };
    
    const match = existingApps.find((app: any) => normalizeUrl(app.url) === normalized);
    if (match) {
      return { isDuplicate: true, appId: match.id, status: match.status };
    }
    return { isDuplicate: false };
  }, [normalizeUrl]);

  const handleBatchAdd = async () => {
    const urls = batchUrls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u && (u.startsWith('http://') || u.startsWith('https://') || !u.startsWith('#')));
    const formatted = urls.map(u => {
      let url = u;
      if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`;
      return url;
    });
    const unique = [...new Set(formatted)];
    
    // Check for duplicates against existing apps
    const newItems: BatchItem[] = [];
    for (const url of unique) {
      if (batchItems.some(p => p.url === url)) continue;
      const dup = await checkDuplicateUrl(url);
      if (dup.isDuplicate && dup.status === 'approved') {
        newItems.push({ url, status: 'duplicate', error: '该链接已存在已通过的应用', duplicateAppId: dup.appId });
      } else if (dup.isDuplicate) {
        newItems.push({ url, status: 'pending', error: `疑似重复（状态：${dup.status}）`, duplicateAppId: dup.appId });
      } else {
        newItems.push({ url, status: 'pending' });
      }
    }
    
    setBatchItems(prev => [...prev, ...newItems]);
    setBatchUrls('');
    
    const dupCount = newItems.filter(i => i.status === 'duplicate').length;
    const suspectCount = newItems.filter(i => i.duplicateAppId && i.status === 'pending').length;
    if (dupCount > 0) toast.warning(`${dupCount} 个链接已存在已通过应用，已标记为重复`);
    if (suspectCount > 0) toast.info(`${suspectCount} 个链接疑似重复，请注意`);
  };

  const handleBatchStart = async () => {
    if (!user) return;
    setBatchRunning(true);
    batchAbortRef.current = false;

    for (let i = 0; i < batchItems.length; i++) {
      if (batchAbortRef.current) break;
      const item = batchItems[i];
      if (item.status === 'success' || item.status === 'duplicate') continue;

      setBatchItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'parsing', error: undefined } : it));

      try {
        const parsed = await parseSingleUrl(item.url);
        let coverUrl: string | null = null;
        if (parsed.screenshotBase64) {
          coverUrl = await uploadScreenshot(parsed.screenshotBase64, user.id);
        }

        const inferredCategory = inferCategory(parsed.title || '', parsed.description || '', parsed.tags || []);
        const appData = {
          user_id: user.id,
          url: item.url,
          title: parsed.title || new URL(item.url).hostname,
          description: parsed.description || '',
          cover_image: coverUrl,
          tags: parsed.tags?.slice(0, 10) || [],
          tech_stack: [],
          platform_type: parsed.platform || null,
          access_type: null,
          monetization_stage: null,
          category: inferredCategory,
          status: 'approved' as const,
          approved_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
        };

        const { data: appResult, error: insertError } = await supabase.from('apps').insert(appData as any).select('id').single();
        if (insertError) throw insertError;

        if (coverUrl && appResult) {
          await supabase.from('app_media').insert({
            app_id: appResult.id,
            media_type: 'cover',
            file_url: coverUrl,
            file_name: 'screenshot.png',
            sort_order: 0,
          } as any);
        }

        setBatchItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'success', title: appData.title, appId: appResult?.id } : it));
      } catch (err: any) {
        setBatchItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'error', error: err.message || '解析失败' } : it));
      }
    }

    setBatchRunning(false);
    queryClient.invalidateQueries({ queryKey: ['admin-apps'] });
    toast.success('批量提交完成');
  };

  const handleBatchRetry = async (index: number) => {
    const items = [...batchItems];
    items[index] = { ...items[index], status: 'pending', error: undefined };
    setBatchItems(items);
    if (!user) return;
    setBatchItems(prev => prev.map((it, idx) => idx === index ? { ...it, status: 'parsing' } : it));
    try {
      const parsed = await parseSingleUrl(items[index].url);
      let coverUrl: string | null = null;
      if (parsed.screenshotBase64) {
        coverUrl = await uploadScreenshot(parsed.screenshotBase64, user.id);
      }
      const inferredCategory = inferCategory(parsed.title || '', parsed.description || '', parsed.tags || []);
      const appData = {
        user_id: user.id,
        url: items[index].url,
        title: parsed.title || new URL(items[index].url).hostname,
        description: parsed.description || '',
        cover_image: coverUrl,
        tags: parsed.tags?.slice(0, 10) || [],
        tech_stack: [],
        platform_type: parsed.platform || null,
        category: inferredCategory,
        status: 'approved' as const,
        approved_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      };
      const { data: appResult, error: insertError } = await supabase.from('apps').insert(appData as any).select('id').single();
      if (insertError) throw insertError;
      if (coverUrl && appResult) {
        await supabase.from('app_media').insert({ app_id: appResult.id, media_type: 'cover', file_url: coverUrl, file_name: 'screenshot.png', sort_order: 0 } as any);
      }
      setBatchItems(prev => prev.map((it, idx) => idx === index ? { ...it, status: 'success', title: appData.title, appId: appResult?.id } : it));
      queryClient.invalidateQueries({ queryKey: ['admin-apps'] });
    } catch (err: any) {
      setBatchItems(prev => prev.map((it, idx) => idx === index ? { ...it, status: 'error', error: err.message } : it));
    }
  };

  // Reset page & selection when filter/search changes
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
    setSelectedApps(new Set());
  };
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    setSelectedApps(new Set());
  };

  const { data: appsResult = { apps: [], totalCount: 0 } } = useQuery({
    queryKey: ['admin-apps', statusFilter, searchQuery, currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase.from('apps').select('*', { count: 'exact' }) as any;
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery.trim()}%,url.ilike.%${searchQuery.trim()}%`);
      }
      const { data: appsData, count } = await query.order('created_at', { ascending: false }).range(from, to);
      if (!appsData || appsData.length === 0) return { apps: [], totalCount: count || 0 };
      
      const userIds = [...new Set(appsData.map((a: any) => a.user_id))] as string[];
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name').in('user_id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name]));
      return {
        apps: appsData.map((a: any) => ({ ...a, profile_display_name: profileMap[a.user_id] || null })),
        totalCount: count || 0,
      };
    },
    enabled: isAdmin,
  });

  const apps = appsResult.apps;
  const totalPages = Math.max(1, Math.ceil(appsResult.totalCount / PAGE_SIZE));

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
      await supabase.from('app_review_logs').insert({
        app_id: appId,
        action,
        operator_id: user!.id,
        note: note || reason || null,
      } as any);

      // Send email notification to author
      if (action === 'approve' || action === 'reject') {
        const targetApp = apps.find((a: any) => a.id === appId);
        if (targetApp) {
          const siteUrl = await getSiteUrl();
          const tpl = action === 'approve' ? 'app-approved-user' : 'app-rejected-user';
          sendTransactionalEmail({
            templateName: tpl,
            recipientEmail: '',
            templateData: {
              recipient_user_id: targetApp.user_id,
              app_title: targetApp.title,
              app_url: `${siteUrl}/app/${appId}`,
              rejection_reason: reason || '',
              review_note: note || '',
            },
          });
        }
      }
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

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedApps(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedApps.size === apps.length) {
      setSelectedApps(new Set());
    } else {
      setSelectedApps(new Set(apps.map((a: any) => a.id)));
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'offline' | 'delete') => {
    if (selectedApps.size === 0) return;
    const ids = Array.from(selectedApps);
    const label = { approve: '通过', reject: '打回', offline: '下线', delete: '删除' }[action];
    if (!confirm(`确定要批量${label} ${ids.length} 个应用吗？`)) return;

    setBulkRunning(true);
    let successCount = 0;
    for (const appId of ids) {
      try {
        if (action === 'delete') {
          await supabase.from('app_review_logs').insert({ app_id: appId, action: 'delete', operator_id: user!.id, note: '批量删除' } as any);
          await supabase.from('apps').delete().eq('id', appId);
        } else {
          const update: any = {};
          if (action === 'approve') { update.status = 'approved'; update.approved_at = new Date().toISOString(); }
          else if (action === 'reject') { update.status = 'rejected'; update.rejection_reason = '批量打回'; }
          else if (action === 'offline') { update.status = 'offline'; }
          await supabase.from('apps').update(update).eq('id', appId);
          await supabase.from('app_review_logs').insert({ app_id: appId, action, operator_id: user!.id, note: `批量${label}` } as any);
        }
        successCount++;
      } catch {}
    }
    setBulkRunning(false);
    setSelectedApps(new Set());
    queryClient.invalidateQueries({ queryKey: ['admin-apps'] });
    toast.success(`批量${label}完成：${successCount}/${ids.length}`);
  };

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
          { key: 'batch' as AdminTab, label: '批量提交', icon: Upload },
          { key: 'users' as AdminTab, label: '用户管理', icon: Users },
          { key: 'stats' as AdminTab, label: '内容统计', icon: BarChart3 },
          { key: 'providers' as AdminTab, label: '服务商管理', icon: Globe },
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
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="搜索应用名称或网址..."
              className="pl-9 bg-secondary/50 border-border/50"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleStatusFilterChange(f.value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  statusFilter === f.value ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground self-center">
              共 {appsResult.totalCount} 条
            </span>
          </div>

          {/* Bulk action bar */}
          {selectedApps.size > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <ListChecks className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium">已选 {selectedApps.size} 项</span>
              <div className="flex gap-1.5 ml-auto">
                <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs" disabled={bulkRunning} onClick={() => handleBulkAction('approve')}>
                  <CheckCircle className="h-3 w-3" /> 批量通过
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-amber-400 border-amber-500/30 h-7 text-xs" disabled={bulkRunning} onClick={() => handleBulkAction('reject')}>
                  <XCircle className="h-3 w-3" /> 批量打回
                </Button>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" disabled={bulkRunning} onClick={() => handleBulkAction('offline')}>
                  <Ban className="h-3 w-3" /> 批量下线
                </Button>
                <Button size="sm" variant="destructive" className="gap-1 h-7 text-xs" disabled={bulkRunning} onClick={() => handleBulkAction('delete')}>
                  <Trash2 className="h-3 w-3" /> 批量删除
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedApps(new Set())}>
                  取消
                </Button>
              </div>
              {bulkRunning && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>
          )}

          {apps.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暂无数据</p>
          ) : (
            <div className="space-y-3">
              {/* Select all */}
              <div className="flex items-center gap-2 px-1">
                <Checkbox
                  checked={apps.length > 0 && selectedApps.size === apps.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-xs text-muted-foreground">全选当页</span>
              </div>
              {apps.map((app: any) => (
                <div key={app.id} className={`glass-card overflow-hidden ${selectedApps.has(app.id) ? 'ring-1 ring-primary/40' : ''}`}>
                  <div className="p-4 flex items-center gap-4">
                    <Checkbox
                      checked={selectedApps.has(app.id)}
                      onCheckedChange={() => toggleSelect(app.id)}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold truncate">{app.title}</span>
                        <StatusBadge status={app.status} />
                        {app.is_for_sale && <span className="text-[10px] px-1.5 rounded bg-emerald-500/10 text-emerald-400">出售</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>提交者：{app.profile_display_name || '未知'}</span>
                        {app.platform_type && <span>平台：{app.platform_type}</span>}
                        {app.category && app.category !== 'other' && <span>分类：{app.category}</span>}
                        <span>阶段：{app.monetization_stage || '未设置'}</span>
                        <span>{new Date(app.created_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{app.url}</div>
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
                    <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-4">
                      <AdminReviewPanel app={app} />
                      <div className="space-y-2 pt-2 border-t border-border/30">
                        <Textarea
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="审核备注（可选，用户可见）"
                          className="text-xs min-h-[60px] bg-secondary/50 border-border/50 resize-none"
                        />
                        {app.status !== 'rejected' && (
                          <Input
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="驳回原因（打回时必填，将通过邮件通知作者）"
                            className="text-xs bg-secondary/50 border-border/50"
                          />
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => reviewAction.mutate({ appId: app.id, action: 'approve', note: reviewNote })}
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> 通过并通知
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
                          <XCircle className="h-3.5 w-3.5" /> 打回并通知
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> 上一页
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 7) {
                    page = i + 1;
                  } else if (currentPage <= 4) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    page = totalPages - 6 + i;
                  } else {
                    page = currentPage - 3 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-8 w-8 rounded-md text-xs font-medium transition-all ${
                        currentPage === page
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="gap-1"
              >
                下一页 <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Batch Tab */}
      {tab === 'batch' && (
        <div className="space-y-4 animate-fade-up stagger-2">
          <div className="glass-card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">批量提交网址</h3>
              <p className="text-xs text-muted-foreground">每行一个网址，系统将逐个解析并自动创建应用（状态为已通过）。已通过的重复链接将被自动拦截。</p>
            </div>
            <Textarea
              value={batchUrls}
              onChange={(e) => setBatchUrls(e.target.value)}
              placeholder={"https://example1.com\nhttps://example2.com\nhttps://example3.com"}
              className="min-h-[120px] bg-secondary/50 border-border/50 font-mono text-xs"
              disabled={batchRunning}
            />
            <div className="flex gap-2">
              <Button onClick={handleBatchAdd} disabled={!batchUrls.trim() || batchRunning} variant="outline" className="gap-1.5">
                <Globe className="h-4 w-4" />
                添加到队列
              </Button>
              <Button onClick={handleBatchStart} disabled={batchItems.filter(i => i.status !== 'success' && i.status !== 'duplicate').length === 0 || batchRunning} className="gap-1.5">
                {batchRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {batchRunning ? '解析中...' : '开始批量解析'}
              </Button>
              {batchRunning && (
                <Button variant="destructive" onClick={() => { batchAbortRef.current = true; }} className="gap-1.5">
                  停止
                </Button>
              )}
              {!batchRunning && batchItems.length > 0 && (
                <Button variant="ghost" onClick={() => setBatchItems([])} className="gap-1.5 text-muted-foreground">
                  <Trash2 className="h-4 w-4" /> 清空
                </Button>
              )}
            </div>
          </div>

          {batchItems.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>共 {batchItems.length} 个网址</span>
                <span>
                  ✅ {batchItems.filter(i => i.status === 'success').length}
                  {' '}❌ {batchItems.filter(i => i.status === 'error').length}
                  {' '}🔁 {batchItems.filter(i => i.status === 'duplicate').length}
                  {' '}⏳ {batchItems.filter(i => i.status === 'pending' || i.status === 'parsing').length}
                </span>
              </div>
              <Progress value={batchItems.filter(i => i.status === 'success' || i.status === 'duplicate').length / batchItems.length * 100} className="h-2" />
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {batchItems.map((item, idx) => (
                  <div key={idx} className={`glass-card px-4 py-2.5 flex items-center gap-3 ${item.status === 'duplicate' ? 'border border-amber-500/30' : ''}`}>
                    <div className="shrink-0">
                      {item.status === 'pending' && !item.duplicateAppId && <div className="h-4 w-4 rounded-full bg-muted" />}
                      {item.status === 'pending' && item.duplicateAppId && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                      {item.status === 'parsing' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      {item.status === 'success' && <CheckCircle className="h-4 w-4 text-primary" />}
                      {item.status === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
                      {item.status === 'duplicate' && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono truncate">{item.url}</div>
                      {item.title && <div className="text-xs text-muted-foreground truncate">{item.title}</div>}
                      {item.error && <div className={`text-xs truncate ${item.status === 'duplicate' ? 'text-amber-400' : item.duplicateAppId ? 'text-amber-400' : 'text-destructive'}`}>{item.error}</div>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.status === 'error' && !batchRunning && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleBatchRetry(idx)}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(item.appId || item.duplicateAppId) && (
                        <Link to={`/app/${item.appId || item.duplicateAppId}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                      {!batchRunning && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBatchItems(prev => prev.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Providers Tab */}
      {tab === 'providers' && <AdminProvidersPanel />}
    </div>
  );
}
