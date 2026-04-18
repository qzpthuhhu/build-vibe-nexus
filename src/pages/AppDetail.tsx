import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AppCard from '@/components/AppCard';
import MediaGallery from '@/components/MediaGallery';
import StatusBadge from '@/components/StatusBadge';
import PlatformBadge from '@/components/PlatformBadge';
import {
  Heart, Bookmark, ExternalLink, Eye, MessageSquare,
  ArrowLeft, Send, ChevronDown, ChevronUp, Monitor,
  QrCode, Download
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ensureHttpUrl, queueEngagementNotification } from '@/lib/url';
import { sendTransactionalEmail, userHasPreference } from '@/lib/email';

export default function AppDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [comment, setComment] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const { data: app, isLoading } = useQuery({
    queryKey: ['app', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('apps').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: author } = useQuery({
    queryKey: ['profile', app?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', app!.user_id).single();
      return data;
    },
    enabled: !!app?.user_id,
  });

  const { data: qrMedia } = useQuery({
    queryKey: ['app-qr', id],
    queryFn: async () => {
      const { data } = await supabase.from('app_media').select('*').eq('app_id', id!).eq('media_type', 'qr_code').limit(1);
      return data?.[0] || null;
    },
    enabled: !!id,
  });

  const { data: isLiked } = useQuery({
    queryKey: ['liked', id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('likes').select('id').eq('app_id', id!).eq('user_id', user!.id).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!id,
  });

  const { data: isFavorited } = useQuery({
    queryKey: ['favorited', id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('favorites').select('id').eq('app_id', id!).eq('user_id', user!.id).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!id,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('app_id', id!)
        .order('created_at', { ascending: false });
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
      return data.map((c: any) => ({ ...c, profile: profileMap[c.user_id] || null }));
    },
    enabled: !!id,
  });

  const { data: similar = [] } = useQuery({
    queryKey: ['similar', id, app?.tags],
    queryFn: async () => {
      if (!app?.tags?.length) return [];
      const { data } = await supabase.from('apps').select('*').neq('id', id!).eq('status', 'approved').overlaps('tags', app.tags).limit(4);
      return data || [];
    },
    enabled: !!app,
  });

  useEffect(() => { if (id) supabase.rpc('increment_app_views', { app_uuid: id }); }, [id]);

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) { toast.error(t('app_detail.please_login')); return; }
      if (isLiked) {
        await supabase.from('likes').delete().eq('app_id', id!).eq('user_id', user.id);
      } else {
        await supabase.from('likes').insert({ app_id: id!, user_id: user.id });
        // Queue engagement notification (daily digest)
        if (app?.user_id) {
          await queueEngagementNotification(supabase, {
            appId: id!,
            actorUserId: user.id,
            recipientUserId: app.user_id,
            eventType: 'like',
          });
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['liked', id] }); queryClient.invalidateQueries({ queryKey: ['app', id] }); },
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!user) { toast.error(t('app_detail.please_login')); return; }
      if (isFavorited) {
        await supabase.from('favorites').delete().eq('app_id', id!).eq('user_id', user.id);
      } else {
        await supabase.from('favorites').insert({ app_id: id!, user_id: user.id });
        if (app?.user_id) {
          await queueEngagementNotification(supabase, {
            appId: id!,
            actorUserId: user.id,
            recipientUserId: app.user_id,
            eventType: 'favorite',
          });
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['favorited', id] }); queryClient.invalidateQueries({ queryKey: ['app', id] }); },
  });

  const submitComment = useMutation({
    mutationFn: async () => {
      if (!user) { toast.error(t('app_detail.please_login')); return; }
      if (!comment.trim()) return;
      const { error } = await supabase.from('comments').insert({ app_id: id!, user_id: user.id, content: comment.trim() });
      if (error) throw error;
      // Notify author by email if not self and prefs allow
      if (app?.user_id && app.user_id !== user.id) {
        const allowed = await userHasPreference(app.user_id, 'comment_notify');
        if (allowed) {
          // Look up author email
          const { data: authorAuth } = await supabase
            .from('profiles')
            .select('user_id, display_name')
            .eq('user_id', app.user_id)
            .maybeSingle();
          // Get email via admin path is not available client-side; rely on edge fn lookup.
          // We pass the recipient user_id; the template expects an email — fall back to skipping if unavailable.
          // Best practice: create an edge function that resolves user_id -> email server-side.
          // For now, try to read from auth via RPC; if not available, the call will simply log and exit.
          await sendTransactionalEmail({
            templateName: 'app-new-comment',
            recipientEmail: '', // resolved server-side via recipient_user_id
            templateData: {
              recipient_user_id: app.user_id,
              app_id: id,
              app_title: app.title,
              commenter_name: authorAuth?.display_name || 'Someone',
              comment_content: comment.trim(),
            },
          });
        }
      }
    },
    onSuccess: () => { setComment(''); queryClient.invalidateQueries({ queryKey: ['comments', id] }); toast.success(t('app_detail.comment_posted')); },
  });

  if (isLoading) {
    return (
      <div className="container py-16 animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-secondary" />
        <div className="aspect-[21/9] rounded-xl bg-secondary" />
        <div className="h-6 w-64 rounded bg-secondary" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="container py-24 text-center text-muted-foreground">
        <p>{t('app_detail.app_not_found')}</p>
        <Link to="/" className="text-primary mt-2 inline-block">{t('app_detail.return_home')}</Link>
      </div>
    );
  }

  const a = app as any;
  const isWebPlatform = ['web', 'h5', 'multi'].includes(a.platform_type || '');
  const previewUrl = ensureHttpUrl(a.experience_url || a.url);
  const externalUrl = ensureHttpUrl(a.url);
  const appStoreUrl = ensureHttpUrl(a.app_store_url);
  const androidUrl = ensureHttpUrl(a.android_download_url);

  return (
    <div className="min-h-screen">
      <div className="container max-w-4xl py-8 space-y-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t('app_detail.back')}
        </Link>

        {/* Hero */}
        <div className="animate-fade-up space-y-6">
          {app.cover_image && (
            <div className="aspect-[21/9] overflow-hidden rounded-xl border border-border/50">
              <img src={app.cover_image} alt={app.title} className="h-full w-full object-cover" />
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold">{app.title}</h1>
                <PlatformBadge platform={a.platform_type} />
                {app.status !== 'approved' && <StatusBadge status={app.status} />}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {author && (
                  <p className="text-sm text-muted-foreground">
                    {t('app_detail.published_by')} <span className="text-foreground">{author.display_name}</span> {t('app_detail.published_suffix')}
                  </p>
                )}
                {a.access_type && (
                  <span className="text-xs rounded-md bg-primary/10 text-primary px-2 py-0.5">
                    {t(`access.${a.access_type}`, { defaultValue: a.access_type }) as string}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a href={externalUrl} target="_blank" rel="noopener noreferrer">
                <Button className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  <ExternalLink className="h-4 w-4" />
                  {t('app_detail.experience')}
                </Button>
              </a>
              <Button variant="outline" size="icon" onClick={() => toggleLike.mutate()} className={isLiked ? 'border-red-500/50 text-red-500' : ''}>
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              <Button variant="outline" size="icon" onClick={() => toggleFavorite.mutate()} className={isFavorited ? 'border-amber-500/50 text-amber-500' : ''}>
                <Bookmark className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {app.likes_count} {t('app_detail.likes')}</span>
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {app.views} {t('app_detail.views')}</span>
            <span className="flex items-center gap-1"><Bookmark className="h-3.5 w-3.5" /> {app.favorites_count} {t('app_detail.favorites')}</span>
          </div>
        </div>

        {/* Tags & Tech */}
        <div className="animate-fade-up stagger-1 space-y-4">
          {app.tags && app.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {app.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}
          {app.tech_stack && app.tech_stack.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {app.tech_stack.map((tch) => (
                <span key={tch} className="rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary font-medium">{tch}</span>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="animate-fade-up stagger-2 glass-card p-6">
          <h2 className="text-lg font-semibold mb-3">{t('app_detail.app_intro')}</h2>
          {app.description ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-secondary prose-pre:text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{app.description}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('app_detail.no_intro')}</p>
          )}
        </div>

        {/* Visual Preview Section */}
        <div className="animate-fade-up stagger-2 space-y-4">
          <h2 className="text-lg font-semibold">{t('app_detail.app_preview')}</h2>
          <MediaGallery appId={app.id} />

          {(qrMedia || a.mini_program_qr_url) && (
            <div className="glass-card p-6 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-primary" />
                {t('app_detail.scan_qr')}
              </h3>
              <div className="flex justify-center">
                <img
                  src={qrMedia?.file_url || a.mini_program_qr_url}
                  alt="QR Code"
                  className="max-w-[200px] rounded-lg border border-border/50"
                />
              </div>
            </div>
          )}

          {(a.app_store_url || a.android_download_url) && (
            <div className="glass-card p-4 space-y-2">
              {a.app_store_url && (
                <a href={appStoreUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/50 transition-colors">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">App Store / TestFlight</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </a>
              )}
              {a.android_download_url && (
                <a href={androidUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/50 transition-colors">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('app_detail.android_download')}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* For Sale */}
        {a.is_for_sale && (
          <div className="animate-fade-up stagger-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">{t('app_detail.project_for_sale')}</h2>
            {a.price && <p className="text-sm"><span className="text-muted-foreground">{t('app_detail.price')}：</span><span className="font-medium text-emerald-400">{a.price}</span></p>}
            {a.contact_info && <p className="text-sm"><span className="text-muted-foreground">{t('app_detail.contact')}：</span><span className="font-medium">{a.contact_info}</span></p>}
          </div>
        )}

        {/* Inline Preview */}
        {isWebPlatform && (
          <div className="animate-fade-up stagger-3 glass-card overflow-hidden">
            <button
              onClick={() => { setShowPreview(!showPreview); setIframeError(false); }}
              className="flex w-full items-center justify-between p-4 text-sm font-medium hover:bg-card-hover transition-colors"
            >
              <span className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" />
                {t('app_detail.inline_preview')}
              </span>
              {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showPreview && (
              <div className="px-4 pb-4">
                {iframeError ? (
                  <div className="rounded-lg bg-secondary/50 p-6 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">{t('app_detail.no_embed')}</p>
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" />{t('app_detail.open_new_window')}</Button>
                    </a>
                  </div>
                ) : (
                  <div className="rounded-lg overflow-hidden border border-border/50">
                    <iframe
                      src={previewUrl}
                      className="w-full h-[500px] bg-white"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      onError={() => setIframeError(true)}
                      onLoad={(e) => {
                        try {
                          const iframe = e.target as HTMLIFrameElement;
                          if (iframe.contentDocument === null) setIframeError(true);
                        } catch { /* cross-origin expected */ }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Prompt */}
        {app.prompt && (
          <div className="animate-fade-up stagger-3 glass-card overflow-hidden">
            <button onClick={() => setShowPrompt(!showPrompt)} className="flex w-full items-center justify-between p-4 text-sm font-medium hover:bg-card-hover transition-colors">
              <span>{t('app_detail.view_prompt')}</span>
              {showPrompt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showPrompt && (
              <div className="px-4 pb-4">
                <pre className="rounded-lg bg-secondary/50 p-4 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">{app.prompt}</pre>
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        <div className="animate-fade-up stagger-4 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('app_detail.comments')} ({comments.length})
          </h2>
          {user && (
            <div className="glass-card p-4 space-y-3">
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('app_detail.write_comment')} className="min-h-[80px] bg-secondary/50 border-border/50 resize-none" />
              <div className="flex justify-end">
                <Button size="sm" onClick={() => submitComment.mutate()} disabled={!comment.trim() || submitComment.isPending} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Send className="h-3.5 w-3.5" />
                  {t('app_detail.submit_comment')}
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-3">
            {comments.map((c: any) => (
              <div key={c.id} className="glass-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {c.profile?.display_name?.[0] || 'U'}
                  </div>
                  <span className="text-sm font-medium">{c.profile?.display_name || t('app_detail.anonymous')}</span>
                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-muted-foreground pl-9">{c.content}</p>
              </div>
            ))}
            {comments.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">{t('app_detail.no_comments')}</p>}
          </div>
        </div>

        {/* Similar */}
        {similar.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('app_detail.similar_apps')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {similar.map((s, i) => <AppCard key={s.id} app={s} index={i} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
