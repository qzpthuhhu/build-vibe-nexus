import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MediaUploader from '@/components/MediaUploader';
import { toast } from 'sonner';
import { ArrowLeft, Send, Sparkles, Save, Loader2, Globe, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { CATEGORIES, inferCategory } from '@/lib/categories';
import { ensureHttpUrl } from '@/lib/url';
import { sendTransactionalEmail, getAdminNotifyEmail, getSiteUrl } from '@/lib/email';

const TECH_OPTIONS = ['Lovable', 'Cursor', 'Dify', 'LangChain', 'OpenAI', 'Claude', 'V0', 'Bolt', 'Replit', '其他'];

interface MediaFile {
  id?: string;
  file_url: string;
  file_name: string;
  media_type: string;
  sort_order: number;
}

type ParseStatus = 'idle' | 'parsing' | 'success' | 'error';

export default function Submit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEdit = !!editId;
  const [loading, setLoading] = useState(false);
  const [descTab, setDescTab] = useState<'write' | 'preview'>('write');
  const { t } = useTranslation();

  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle');
  const [parseProgress, setParseProgress] = useState(0);
  const [parseError, setParseError] = useState('');

  const [form, setForm] = useState({
    url: '',
    title: '',
    description: '',
    tags: '',
    tech_stack: [] as string[],
    prompt: '',
    monetization_stage: '',
    is_for_sale: false,
    price: '',
    contact_info: '',
    platform_type: '',
    access_type: '',
    experience_url: '',
    mini_program_qr_url: '',
    app_store_url: '',
    android_download_url: '',
    category: '',
  });

  const [coverFiles, setCoverFiles] = useState<MediaFile[]>([]);
  const [screenshotFiles, setScreenshotFiles] = useState<MediaFile[]>([]);
  const [videoFiles, setVideoFiles] = useState<MediaFile[]>([]);
  const [docFiles, setDocFiles] = useState<MediaFile[]>([]);
  const [qrFiles, setQrFiles] = useState<MediaFile[]>([]);

  const STAGE_OPTIONS = [
    { value: 'pending_tbd', label: t('submit_page.pending_tbd') },
    { value: 'personal', label: t('stages.personal'), desc: t('stages.personal_desc') },
    { value: 'early', label: t('stages.early'), desc: t('stages.early_desc') },
    { value: 'revenue', label: t('stages.revenue'), desc: t('stages.revenue_desc') },
    { value: 'growing', label: t('stages.growing'), desc: t('stages.growing_desc') },
    { value: 'mature', label: t('stages.mature'), desc: t('stages.mature_desc') },
  ];

  const PLATFORM_OPTIONS = [
    { value: 'pending_tbd', label: t('submit_page.pending_tbd') },
    { value: 'web', label: t('platforms.web') },
    { value: 'h5', label: t('platforms.h5') },
    { value: 'wechat_mini', label: t('platforms.wechat_mini') },
    { value: 'ios', label: t('platforms.ios') },
    { value: 'android', label: t('platforms.android') },
    { value: 'desktop', label: t('platforms.desktop') },
    { value: 'multi', label: t('platforms.multi') },
    { value: 'other', label: t('platforms.other') },
  ];

  const ACCESS_OPTIONS = [
    { value: 'pending_tbd', label: t('submit_page.pending_tbd') },
    { value: 'public_link', label: t('access.public_link') },
    { value: 'qr_code', label: t('access.qr_code') },
    { value: 'invite_code', label: t('access.invite_code') },
    { value: 'app_store', label: t('access.app_store') },
    { value: 'testflight', label: t('access.testflight') },
    { value: 'private_beta', label: t('access.private_beta') },
  ];

  const { data: existingApp } = useQuery({
    queryKey: ['edit-app', editId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .eq('id', editId!)
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit && !!user,
  });

  const { data: existingMedia = [] } = useQuery({
    queryKey: ['edit-app-media', editId],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_media')
        .select('*')
        .eq('app_id', editId!)
        .order('sort_order');
      return data || [];
    },
    enabled: isEdit && !!user,
  });

  useEffect(() => {
    if (existingApp) {
      const a = existingApp as any;
      setForm({
        url: a.url || '',
        title: a.title || '',
        description: a.description || '',
        tags: a.tags?.join(', ') || '',
        tech_stack: a.tech_stack || [],
        prompt: a.prompt || '',
        monetization_stage: a.monetization_stage || '',
        is_for_sale: a.is_for_sale || false,
        price: a.price || '',
        contact_info: a.contact_info || '',
        platform_type: a.platform_type || '',
        access_type: a.access_type || '',
        experience_url: a.experience_url || '',
        mini_program_qr_url: a.mini_program_qr_url || '',
        app_store_url: a.app_store_url || '',
        android_download_url: a.android_download_url || '',
        category: a.category || '',
      });
    }
  }, [existingApp]);

  useEffect(() => {
    if (existingMedia.length > 0) {
      setCoverFiles(existingMedia.filter((m: any) => m.media_type === 'cover').map((m: any) => ({
        id: m.id, file_url: m.file_url, file_name: m.file_name || '', media_type: m.media_type, sort_order: m.sort_order,
      })));
      setScreenshotFiles(existingMedia.filter((m: any) => m.media_type === 'screenshot').map((m: any) => ({
        id: m.id, file_url: m.file_url, file_name: m.file_name || '', media_type: m.media_type, sort_order: m.sort_order,
      })));
      setVideoFiles(existingMedia.filter((m: any) => m.media_type === 'video').map((m: any) => ({
        id: m.id, file_url: m.file_url, file_name: m.file_name || '', media_type: m.media_type, sort_order: m.sort_order,
      })));
      setDocFiles(existingMedia.filter((m: any) => m.media_type === 'document').map((m: any) => ({
        id: m.id, file_url: m.file_url, file_name: m.file_name || '', media_type: m.media_type, sort_order: m.sort_order,
      })));
      setQrFiles(existingMedia.filter((m: any) => m.media_type === 'qr_code').map((m: any) => ({
        id: m.id, file_url: m.file_url, file_name: m.file_name || '', media_type: m.media_type, sort_order: m.sort_order,
      })));
    }
  }, [existingMedia]);

  // Auto-parse URL
  const handleParseUrl = async () => {
    if (!form.url.trim()) {
      toast.error(t('submit_page.fill_url_first'));
      return;
    }

    setParseStatus('parsing');
    setParseProgress(10);
    setParseError('');

    try {
      setParseProgress(30);
      const { data, error } = await supabase.functions.invoke('parse-url', {
        body: { url: form.url.trim() },
      });

      setParseProgress(70);

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || t('submit_page.parse_failed'));
      }

      const parsed = data.data;
      setParseProgress(80);

      // Fill form with parsed data
      const inferredCategory = inferCategory(parsed.title || '', parsed.description || '', parsed.tags || []);
      setForm(prev => ({
        ...prev,
        title: parsed.title || prev.title,
        description: parsed.description || prev.description,
        tags: parsed.tags?.length > 0 ? parsed.tags.join(', ') : prev.tags,
        platform_type: parsed.platform || 'pending_tbd',
        access_type: prev.access_type || 'pending_tbd',
        monetization_stage: prev.monetization_stage || 'pending_tbd',
        category: prev.category || inferredCategory,
      }));

      // Upload screenshot base64 to storage if available
      if (parsed.screenshotBase64 && user) {
        setParseProgress(90);
        try {
          const base64Data = parsed.screenshotBase64;
          const mimeMatch = base64Data.match(/^data:(image\/\w+);base64,/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
          const ext = mime === 'image/jpeg' ? 'jpg' : 'png';
          const raw = atob(base64Data.replace(/^data:image\/\w+;base64,/, ''));
          const arr = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
          const blob = new Blob([arr], { type: mime });

          const fileName = `${user.id}/${Date.now()}-screenshot.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('app-media')
            .upload(fileName, blob, { contentType: mime, upsert: true });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('app-media')
              .getPublicUrl(fileName);
            const publicUrl = urlData.publicUrl;

            const screenshotFile: MediaFile = {
              file_url: publicUrl,
              file_name: `screenshot.${ext}`,
              media_type: 'cover',
              sort_order: 0,
            };
            if (coverFiles.length === 0) {
              setCoverFiles([screenshotFile]);
            }
            if (screenshotFiles.length === 0) {
              setScreenshotFiles([{
                ...screenshotFile,
                media_type: 'screenshot',
              }]);
            }
          } else {
            console.error('Screenshot upload failed:', uploadError);
          }
        } catch (e) {
          console.error('Screenshot processing error:', e);
        }
      }

      setParseProgress(100);
      setParseStatus('success');
      toast.success(t('submit_page.parse_success'));
    } catch (err: any) {
      setParseStatus('error');
      setParseError(err.message || t('submit_page.parse_failed'));
      toast.error(err.message || t('submit_page.parse_failed'));
    }
  };

  const saveMedia = async (appId: string) => {
    if (isEdit) {
      await supabase.from('app_media').delete().eq('app_id', appId);
    }
    const allMedia = [...coverFiles, ...screenshotFiles, ...videoFiles, ...docFiles, ...qrFiles];
    if (allMedia.length > 0) {
      await supabase.from('app_media').insert(
        allMedia.map((m, i) => ({
          app_id: appId,
          media_type: m.media_type,
          file_url: m.file_url,
          file_name: m.file_name,
          sort_order: i,
        })) as any
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent, asDraft = false) => {
    e.preventDefault();
    if (!user) { toast.error(t('submit_page.login_first')); return; }
    if (!form.url || !form.title) { toast.error(t('submit_page.fill_required')); return; }
    if (!asDraft && !form.monetization_stage) { toast.error(t('submit_page.select_stage')); return; }
    if (!asDraft && !form.platform_type) { toast.error(t('submit_page.select_platform')); return; }
    if (form.is_for_sale && !form.contact_info.trim()) {
      toast.error(t('submit_page.sale_contact_required'));
      return;
    }

    setLoading(true);
    try {
      const coverUrl = coverFiles.length > 0 ? coverFiles[0].file_url : null;
      const qrUrl = qrFiles.length > 0 ? qrFiles[0].file_url : form.mini_program_qr_url || null;
      const stage = form.monetization_stage === 'pending_tbd' ? null : form.monetization_stage;
      const platform = form.platform_type === 'pending_tbd' ? null : form.platform_type;
      const access = form.access_type === 'pending_tbd' ? null : form.access_type;

      const appData = {
        user_id: user.id,
        url: ensureHttpUrl(form.url),
        title: form.title,
        description: form.description,
        cover_image: coverUrl,
        tags: form.tags.split(/[,，、]/).map(t => t.trim()).filter(Boolean),
        tech_stack: form.tech_stack,
        prompt: form.prompt || null,
        monetization_stage: stage || null,
        is_for_sale: form.is_for_sale,
        price: form.is_for_sale ? (form.price || null) : null,
        contact_info: form.is_for_sale ? form.contact_info : null,
        status: asDraft ? 'draft' : 'pending',
        submitted_at: asDraft ? null : new Date().toISOString(),
        platform_type: platform || null,
        access_type: access || null,
        experience_url: ensureHttpUrl(form.experience_url) || null,
        mini_program_qr_url: qrUrl,
        app_store_url: ensureHttpUrl(form.app_store_url) || null,
        android_download_url: ensureHttpUrl(form.android_download_url) || null,
        category: form.category || 'other',
      } as any;

      let savedAppId: string | null = isEdit ? editId! : null;
      if (isEdit) {
        const { error } = await supabase.from('apps').update(appData).eq('id', editId!);
        if (error) throw error;
        await saveMedia(editId!);
        toast.success(asDraft ? t('submit_page.draft_saved') : t('submit_page.resubmitted'));
      } else {
        const { data, error } = await supabase.from('apps').insert(appData).select('id').single();
        if (error) throw error;
        savedAppId = data.id;
        await saveMedia(data.id);

        if (!asDraft) {
          await supabase.from('credit_transactions').insert({
            user_id: user.id,
            amount: 20,
            type: 'publish',
            description: t('submit_page.publish_reward'),
          });
          const { data: profileData } = await supabase.from('profiles').select('credits').eq('user_id', user.id).single();
          if (profileData) {
            await supabase.from('profiles').update({ credits: profileData.credits + 20 }).eq('user_id', user.id);
          }
          toast.success(t('submit_page.submit_success'));
        } else {
          toast.success(t('submit_page.draft_saved'));
        }
      }

      // Fire submission notifications (only when actually submitted for review)
      if (!asDraft && savedAppId) {
        const siteUrl = await getSiteUrl();
        const adminEmail = await getAdminNotifyEmail();
        const appUrl = `${siteUrl}/app/${savedAppId}`;
        // Notify admin
        sendTransactionalEmail({
          templateName: 'app-submitted-admin',
          recipientEmail: adminEmail,
          templateData: {
            app_title: appData.title,
            app_url: appUrl,
            submitter_email: user.email,
            description: appData.description || '',
          },
        });
        // Confirm to submitter
        if (user.email) {
          sendTransactionalEmail({
            templateName: 'app-submitted-user',
            recipientEmail: user.email,
            templateData: {
              app_title: appData.title,
              app_url: appUrl,
            },
          });
        }
      }
      navigate('/profile');
    } catch (err: any) {
      toast.error(err.message || t('auth.operation_failed'));
    } finally {
      setLoading(false);
    }
  };

  const showWebFields = ['web', 'h5', 'multi'].includes(form.platform_type);
  const showMiniProgramFields = ['wechat_mini', 'multi'].includes(form.platform_type);
  const showIosFields = ['ios', 'multi'].includes(form.platform_type);
  const showAndroidFields = ['android', 'multi'].includes(form.platform_type);

  if (!user) {
    return (
      <div className="container max-w-lg py-24 text-center space-y-4">
        <p className="text-muted-foreground">{t('submit_page.login_to_submit')}</p>
        <Link to="/auth"><Button className="bg-primary text-primary-foreground">{t('submit_page.go_login')}</Button></Link>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <Link to={isEdit ? '/profile' : '/'} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        {t('submit_page.back')}
      </Link>

      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold mb-1">{isEdit ? t('submit_page.edit_app') : t('submit_page.submit_new')}</h1>
        <p className="text-sm text-muted-foreground">
          {isEdit ? t('submit_page.edit_desc') : t('submit_page.submit_desc')}
        </p>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="animate-fade-up stagger-1 space-y-5">
        {/* URL + Auto Parse */}
        <div className="glass-card p-6 space-y-5">
          <div className="space-y-2">
            <Label>{t('submit_page.app_url')} *</Label>
            <div className="flex gap-2">
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder={t('submit_page.app_url_placeholder')}
                className="bg-secondary/50 border-border/50 flex-1"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleParseUrl}
                disabled={parseStatus === 'parsing' || !form.url.trim()}
                className="gap-1.5 shrink-0"
              >
                {parseStatus === 'parsing' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                {t('submit_page.auto_parse')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('submit_page.auto_parse_hint')}</p>
          </div>

          {/* Parse Progress */}
          {parseStatus !== 'idle' && (
            <div className="space-y-2 animate-fade-up">
              {parseStatus === 'parsing' && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('submit_page.parsing')}
                  </div>
                  <Progress value={parseProgress} className="h-2" />
                </>
              )}
              {parseStatus === 'success' && (
                <div className="flex items-center justify-between rounded-md bg-primary/10 border border-primary/20 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('submit_page.parse_success')}
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={handleParseUrl} className="h-7 gap-1 text-xs">
                    <RotateCcw className="h-3 w-3" />
                    {t('submit_page.reparse')}
                  </Button>
                </div>
              )}
              {parseStatus === 'error' && (
                <div className="flex items-center justify-between rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <XCircle className="h-4 w-4" />
                    {parseError || t('submit_page.parse_failed')}
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={handleParseUrl} className="h-7 gap-1 text-xs">
                    <RotateCcw className="h-3 w-3" />
                    {t('submit_page.retry')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="glass-card p-6 space-y-5">
          <div className="space-y-2">
            <Label>{t('submit_page.app_title')} *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('submit_page.app_title_placeholder')} className="bg-secondary/50 border-border/50" required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('submit_page.app_desc')}</Label>
              <div className="flex gap-1 rounded-md bg-secondary/50 p-0.5 text-xs">
                <button type="button" onClick={() => setDescTab('write')} className={`px-2.5 py-1 rounded transition-colors ${descTab === 'write' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t('submit_page.write', 'Write')}
                </button>
                <button type="button" onClick={() => setDescTab('preview')} className={`px-2.5 py-1 rounded transition-colors ${descTab === 'preview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t('submit_page.preview', 'Preview')}
                </button>
              </div>
            </div>
            {descTab === 'write' ? (
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('submit_page.app_desc_placeholder')} className="min-h-[180px] bg-secondary/50 border-border/50 resize-none font-mono text-sm" />
            ) : (
              <div className="min-h-[180px] rounded-md border border-border/50 bg-secondary/50 p-4 prose prose-sm dark:prose-invert max-w-none text-muted-foreground prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-secondary prose-pre:text-foreground">
                {form.description ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.description}</ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground/50 italic">{t('submit_page.app_desc_placeholder')}</p>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('submit_page.tags')}</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder={t('submit_page.tags_placeholder')} className="bg-secondary/50 border-border/50" />
          </div>
          <div className="space-y-2">
            <Label>{t('submit_page.tech_stack')}</Label>
            <div className="flex flex-wrap gap-2">
              {TECH_OPTIONS.map((tech) => (
                <button
                  key={tech}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      tech_stack: form.tech_stack.includes(tech)
                        ? form.tech_stack.filter((item) => item !== tech)
                        : [...form.tech_stack, tech],
                    })
                  }
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    form.tech_stack.includes(tech)
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-secondary text-muted-foreground hover:text-foreground border border-transparent'
                  }`}
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t('submit_page.prompt_label')}
            </Label>
            <Textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder={t('submit_page.prompt_placeholder')} className="min-h-[100px] bg-secondary/50 border-border/50 resize-none font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <Label>{t('submit_page.project_stage')} *</Label>
            <Select value={form.monetization_stage} onValueChange={(v) => setForm({ ...form, monetization_stage: v })}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder={t('submit_page.stage_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {STAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span>{opt.label}</span>
                    {opt.desc && <span className="ml-2 text-muted-foreground text-xs">{opt.desc}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('submit_page.category')} *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder={t('submit_page.category_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`categories.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Platform & Access */}
        <div className="glass-card p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold mb-1">{t('submit_page.platform_access')}</h3>
            <p className="text-xs text-muted-foreground">{t('submit_page.platform_access_desc')}</p>
          </div>
          <div className="space-y-2">
            <Label>{t('submit_page.platform')} *</Label>
            <Select value={form.platform_type} onValueChange={(v) => setForm({ ...form, platform_type: v })}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder={t('submit_page.platform_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('submit_page.access_method')}</Label>
            <Select value={form.access_type} onValueChange={(v) => setForm({ ...form, access_type: v })}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder={t('submit_page.access_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showWebFields && (
            <div className="space-y-2 animate-fade-up">
              <Label>{t('submit_page.web_experience_url')}</Label>
              <Input value={form.experience_url} onChange={(e) => setForm({ ...form, experience_url: e.target.value })} placeholder="https://your-app.com" className="bg-secondary/50 border-border/50" />
              <p className="text-xs text-muted-foreground">{t('submit_page.web_url_hint')}</p>
            </div>
          )}
          {showMiniProgramFields && (
            <div className="space-y-3 animate-fade-up">
              <Label>{t('submit_page.mini_program_qr')}</Label>
              <MediaUploader
                mediaType="qr_code"
                files={qrFiles}
                onChange={setQrFiles}
                max={1}
                label={t('submit_page.upload_qr')}
                accept="image/*"
              />
            </div>
          )}
          {showIosFields && (
            <div className="space-y-2 animate-fade-up">
              <Label>{t('submit_page.appstore_link')}</Label>
              <Input value={form.app_store_url} onChange={(e) => setForm({ ...form, app_store_url: e.target.value })} placeholder="https://apps.apple.com/..." className="bg-secondary/50 border-border/50" />
            </div>
          )}
          {showAndroidFields && (
            <div className="space-y-2 animate-fade-up">
              <Label>{t('submit_page.android_link')}</Label>
              <Input value={form.android_download_url} onChange={(e) => setForm({ ...form, android_download_url: e.target.value })} placeholder={t('submit_page.android_placeholder')} className="bg-secondary/50 border-border/50" />
            </div>
          )}
        </div>

        {/* Media Upload */}
        <div className="glass-card p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold mb-1">{t('submit_page.media')}</h3>
            <p className="text-xs text-muted-foreground">{t('submit_page.media_desc')}</p>
          </div>
          <MediaUploader mediaType="cover" files={coverFiles} onChange={setCoverFiles} max={1} label={t('submit_page.cover')} accept="image/*" />
          <MediaUploader mediaType="screenshot" files={screenshotFiles} onChange={setScreenshotFiles} max={6} label={t('submit_page.screenshots')} accept="image/*" />
          <MediaUploader mediaType="video" files={videoFiles} onChange={setVideoFiles} max={1} label={t('submit_page.video')} accept="video/*" />
          <MediaUploader mediaType="document" files={docFiles} onChange={setDocFiles} max={5} label={t('submit_page.docs')} accept=".pdf,.doc,.docx" />
        </div>

        {/* Sale Section */}
        <div className="glass-card p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold mb-1">{t('submit_page.sale_section')}</h3>
            <p className="text-xs text-muted-foreground">{t('submit_page.sale_desc')}</p>
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('submit_page.is_for_sale')}</Label>
            <Switch checked={form.is_for_sale} onCheckedChange={(v) => setForm({ ...form, is_for_sale: v })} />
          </div>
          {form.is_for_sale && (
            <div className="space-y-4 animate-fade-up">
              <div className="space-y-2">
                <Label>{t('submit_page.sale_price')}</Label>
                <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder={t('submit_page.price_placeholder')} className="bg-secondary/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <Label>{t('submit_page.contact')} *</Label>
                <Input value={form.contact_info} onChange={(e) => setForm({ ...form, contact_info: e.target.value })} placeholder={t('submit_page.contact_placeholder')} className="bg-secondary/50 border-border/50" required />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={(e) => handleSubmit(e as any, true)} disabled={loading} className="flex-1 gap-2 h-11">
            <Save className="h-4 w-4" />
            {t('submit_page.save_draft')}
          </Button>
          <Button type="submit" disabled={loading} className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11">
            <Send className="h-4 w-4" />
            {loading ? t('submit_page.submitting') : isEdit ? t('submit_page.resubmit') : t('submit_page.submit_review')}
          </Button>
        </div>
      </form>
    </div>
  );
}
