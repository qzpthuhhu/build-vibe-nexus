import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink, Tag, Wrench, Smartphone, DollarSign, FileText, History, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MediaGallery from '@/components/MediaGallery';
import { ensureHttpUrl } from '@/lib/url';

interface Props {
  app: any;
}

const FIELD_LABEL = 'text-[10px] uppercase tracking-wide text-muted-foreground/70';

export default function AdminReviewPanel({ app }: Props) {
  const { data: logs = [] } = useQuery({
    queryKey: ['app-review-logs', app.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_review_logs')
        .select('*')
        .eq('app_id', app.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const externalUrl = ensureHttpUrl(app.url);
  const expUrl = ensureHttpUrl(app.experience_url);
  const appStoreUrl = ensureHttpUrl(app.app_store_url);
  const androidUrl = ensureHttpUrl(app.android_download_url);

  return (
    <div className="space-y-4 text-sm">
      {/* Header line: open external */}
      <div className="flex items-start gap-3">
        {app.cover_image && (
          <img src={app.cover_image} alt="" className="h-16 w-24 rounded object-cover border border-border/50" />
        )}
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {externalUrl}
            </a>
          </div>
          <div className="text-xs text-muted-foreground">
            {app.profile_display_name || '未知作者'} · {new Date(app.created_at).toLocaleString('zh-CN')}
          </div>
        </div>
      </div>

      {/* Description */}
      {app.description && (
        <div className="rounded-lg bg-secondary/30 p-3">
          <div className={FIELD_LABEL + ' mb-1.5'}>简介</div>
          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{app.description}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Meta grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <div className={FIELD_LABEL}>分类</div>
          <div className="text-xs">{app.category || '-'}</div>
        </div>
        <div>
          <div className={FIELD_LABEL}>平台</div>
          <div className="text-xs">{app.platform_type || '-'}</div>
        </div>
        <div>
          <div className={FIELD_LABEL}>访问方式</div>
          <div className="text-xs">{app.access_type || '-'}</div>
        </div>
        <div>
          <div className={FIELD_LABEL}>项目阶段</div>
          <div className="text-xs">{app.monetization_stage || '-'}</div>
        </div>
        <div>
          <div className={FIELD_LABEL}>提交时间</div>
          <div className="text-xs">{app.submitted_at ? new Date(app.submitted_at).toLocaleString('zh-CN') : '-'}</div>
        </div>
        <div>
          <div className={FIELD_LABEL}>互动</div>
          <div className="text-xs">👁 {app.views} · ❤️ {app.likes_count} · ⭐ {app.favorites_count}</div>
        </div>
      </div>

      {/* Tags + Tech */}
      {(app.tags?.length > 0 || app.tech_stack?.length > 0) && (
        <div className="space-y-2">
          {app.tags?.length > 0 && (
            <div className="flex items-start gap-2">
              <Tag className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex flex-wrap gap-1">
                {app.tags.map((tag: string) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {app.tech_stack?.length > 0 && (
            <div className="flex items-start gap-2">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex flex-wrap gap-1">
                {app.tech_stack.map((tch: string) => (
                  <span key={tch} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{tch}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Platform-specific links */}
      {(expUrl || appStoreUrl || androidUrl) && (
        <div className="rounded-lg bg-secondary/30 p-3 space-y-1.5">
          <div className={FIELD_LABEL + ' flex items-center gap-1'}><Smartphone className="h-3 w-3" /> 体验/下载</div>
          {expUrl && (
            <a href={expUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline truncate">体验地址：{expUrl}</a>
          )}
          {appStoreUrl && (
            <a href={appStoreUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline truncate">App Store：{appStoreUrl}</a>
          )}
          {androidUrl && (
            <a href={androidUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline truncate">Android：{androidUrl}</a>
          )}
        </div>
      )}

      {/* Sale info */}
      {app.is_for_sale && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1">
          <div className={FIELD_LABEL + ' flex items-center gap-1'}><DollarSign className="h-3 w-3" /> 项目出售</div>
          <div className="text-xs">价格：<span className="font-medium">{app.price || '面议'}</span></div>
          <div className="text-xs">联系方式：<span className="font-medium">{app.contact_info || '-'}</span></div>
        </div>
      )}

      {/* Prompt */}
      {app.prompt && (
        <details className="rounded-lg bg-secondary/30 p-3">
          <summary className={FIELD_LABEL + ' cursor-pointer flex items-center gap-1'}>
            <Sparkles className="h-3 w-3" /> Prompt / 工作流
          </summary>
          <pre className="mt-2 text-[11px] whitespace-pre-wrap text-muted-foreground">{app.prompt}</pre>
        </details>
      )}

      {/* Media gallery */}
      <div className="space-y-1.5">
        <div className={FIELD_LABEL + ' flex items-center gap-1'}><FileText className="h-3 w-3" /> 媒体</div>
        <MediaGallery appId={app.id} />
      </div>

      {/* Review history */}
      {logs.length > 0 && (
        <details className="rounded-lg bg-secondary/30 p-3" open>
          <summary className={FIELD_LABEL + ' cursor-pointer flex items-center gap-1'}>
            <History className="h-3 w-3" /> 历史审核日志（{logs.length}）
          </summary>
          <ul className="mt-2 space-y-1.5">
            {logs.map((log: any) => (
              <li key={log.id} className="text-[11px] text-muted-foreground flex items-start gap-2">
                <span className="text-foreground/80 font-medium shrink-0">{log.action}</span>
                <span className="shrink-0">{new Date(log.created_at).toLocaleString('zh-CN')}</span>
                {log.note && <span className="truncate">— {log.note}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Existing rejection reason */}
      {app.rejection_reason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <div className={FIELD_LABEL}>当前驳回原因</div>
          <div className="text-xs text-destructive mt-1">{app.rejection_reason}</div>
        </div>
      )}
    </div>
  );
}
