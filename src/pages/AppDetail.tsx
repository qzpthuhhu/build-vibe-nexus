import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AppCard from '@/components/AppCard';
import {
  Heart, Bookmark, ExternalLink, Eye, MessageSquare,
  ArrowLeft, Send, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

export default function AppDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);

  const { data: app, isLoading } = useQuery({
    queryKey: ['app', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: author } = useQuery({
    queryKey: ['profile', app?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', app!.user_id)
        .single();
      return data;
    },
    enabled: !!app?.user_id,
  });

  const { data: isLiked } = useQuery({
    queryKey: ['liked', id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('app_id', id!)
        .eq('user_id', user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!id,
  });

  const { data: isFavorited } = useQuery({
    queryKey: ['favorited', id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('app_id', id!)
        .eq('user_id', user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!id,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('comments')
        .select('*, profiles!comments_user_id_fkey(display_name, avatar_url)')
        .eq('app_id', id!)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: similar = [] } = useQuery({
    queryKey: ['similar', id, app?.tags],
    queryFn: async () => {
      if (!app?.tags?.length) return [];
      const { data } = await supabase
        .from('apps')
        .select('*')
        .neq('id', id!)
        .eq('status', 'approved')
        .overlaps('tags', app.tags)
        .limit(4);
      return data || [];
    },
    enabled: !!app,
  });

  // Increment views
  useEffect(() => {
    if (id) {
      supabase.rpc('increment_app_views', { app_uuid: id });
    }
  }, [id]);

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) { toast.error('请先登录'); return; }
      if (isLiked) {
        await supabase.from('likes').delete().eq('app_id', id!).eq('user_id', user.id);
      } else {
        await supabase.from('likes').insert({ app_id: id!, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liked', id] });
      queryClient.invalidateQueries({ queryKey: ['app', id] });
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!user) { toast.error('请先登录'); return; }
      if (isFavorited) {
        await supabase.from('favorites').delete().eq('app_id', id!).eq('user_id', user.id);
      } else {
        await supabase.from('favorites').insert({ app_id: id!, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorited', id] });
      queryClient.invalidateQueries({ queryKey: ['app', id] });
    },
  });

  const submitComment = useMutation({
    mutationFn: async () => {
      if (!user) { toast.error('请先登录'); return; }
      if (!comment.trim()) return;
      const { error } = await supabase.from('comments').insert({
        app_id: id!,
        user_id: user.id,
        content: comment.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      toast.success('评论已发布');
    },
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
        <p>应用未找到</p>
        <Link to="/" className="text-primary mt-2 inline-block">返回首页</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container max-w-4xl py-8 space-y-8">
        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          返回
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
              <h1 className="text-2xl md:text-3xl font-bold">{app.title}</h1>
              {author && (
                <p className="text-sm text-muted-foreground">
                  由 <span className="text-foreground">{author.display_name}</span> 发布
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a href={app.url} target="_blank" rel="noopener noreferrer">
                <Button className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  <ExternalLink className="h-4 w-4" />
                  立即体验
                </Button>
              </a>
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggleLike.mutate()}
                className={isLiked ? 'border-red-500/50 text-red-500' : ''}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggleFavorite.mutate()}
                className={isFavorited ? 'border-amber-500/50 text-amber-500' : ''}
              >
                <Bookmark className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {app.likes_count} 赞</span>
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {app.views} 浏览</span>
            <span className="flex items-center gap-1"><Bookmark className="h-3.5 w-3.5" /> {app.favorites_count} 收藏</span>
          </div>
        </div>

        {/* Tags & Tech */}
        <div className="animate-fade-up stagger-1 space-y-4">
          {app.tags && app.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {app.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {app.tech_stack && app.tech_stack.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {app.tech_stack.map((t) => (
                <span key={t} className="rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary font-medium">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="animate-fade-up stagger-2 glass-card p-6">
          <h2 className="text-lg font-semibold mb-3">应用介绍</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {app.description || '暂无介绍'}
          </p>
        </div>

        {/* For Sale */}
        {(app as any).is_for_sale && (
          <div className="animate-fade-up stagger-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              💸 项目出售中
            </h2>
            {(app as any).price && (
              <p className="text-sm"><span className="text-muted-foreground">售价：</span><span className="font-medium text-emerald-400">{(app as any).price}</span></p>
            )}
            {(app as any).contact_info && (
              <p className="text-sm"><span className="text-muted-foreground">联系方式：</span><span className="font-medium">{(app as any).contact_info}</span></p>
            )}
          </div>
        )}

        {/* Prompt */}
        {app.prompt && (
          <div className="animate-fade-up stagger-3 glass-card overflow-hidden">
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="flex w-full items-center justify-between p-4 text-sm font-medium hover:bg-card-hover transition-colors"
            >
              <span>查看 Prompt / 工作流</span>
              {showPrompt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showPrompt && (
              <div className="px-4 pb-4">
                <pre className="rounded-lg bg-secondary/50 p-4 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                  {app.prompt}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        <div className="animate-fade-up stagger-4 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            评论 ({comments.length})
          </h2>

          {user && (
            <div className="glass-card p-4 space-y-3">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="写下你的想法..."
                className="min-h-[80px] bg-secondary/50 border-border/50 resize-none"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => submitComment.mutate()}
                  disabled={!comment.trim() || submitComment.isPending}
                  className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Send className="h-3.5 w-3.5" />
                  发布评论
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {comments.map((c: any) => (
              <div key={c.id} className="glass-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {c.profiles?.display_name?.[0] || 'U'}
                  </div>
                  <span className="text-sm font-medium">{c.profiles?.display_name || '匿名'}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground pl-9">{c.content}</p>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">还没有评论，来说点什么吧</p>
            )}
          </div>
        </div>

        {/* Similar */}
        {similar.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">相似应用</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {similar.map((s, i) => (
                <AppCard key={s.id} app={s} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
