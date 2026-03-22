import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MediaUploader from '@/components/MediaUploader';
import { toast } from 'sonner';
import { ArrowLeft, Send, Sparkles, Save } from 'lucide-react';

const TECH_OPTIONS = ['Lovable', 'Cursor', 'Dify', 'LangChain', 'OpenAI', 'Claude', 'V0', 'Bolt', 'Replit', '其他'];

const STAGE_OPTIONS = [
  { value: 'personal', label: '🧪 自用项目', desc: '个人使用，无用户' },
  { value: 'early', label: '🌱 早期项目', desc: '已有用户，尚未变现' },
  { value: 'revenue', label: '💰 已有收入', desc: '开始产生收入' },
  { value: 'growing', label: '📈 持续增长', desc: '稳定收入中' },
  { value: 'mature', label: '🚀 成熟项目', desc: '公司化/规模化' },
];

interface MediaFile {
  id?: string;
  file_url: string;
  file_name: string;
  media_type: string;
  sort_order: number;
}

export default function Submit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEdit = !!editId;
  const [loading, setLoading] = useState(false);

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
  });

  const [coverFiles, setCoverFiles] = useState<MediaFile[]>([]);
  const [screenshotFiles, setScreenshotFiles] = useState<MediaFile[]>([]);
  const [videoFiles, setVideoFiles] = useState<MediaFile[]>([]);
  const [docFiles, setDocFiles] = useState<MediaFile[]>([]);

  // Load existing app data for editing
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
      setForm({
        url: existingApp.url || '',
        title: existingApp.title || '',
        description: existingApp.description || '',
        tags: existingApp.tags?.join(', ') || '',
        tech_stack: existingApp.tech_stack || [],
        prompt: existingApp.prompt || '',
        monetization_stage: (existingApp as any).monetization_stage || '',
        is_for_sale: (existingApp as any).is_for_sale || false,
        price: (existingApp as any).price || '',
        contact_info: (existingApp as any).contact_info || '',
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
    }
  }, [existingMedia]);

  const saveMedia = async (appId: string) => {
    // Delete old media
    if (isEdit) {
      await supabase.from('app_media').delete().eq('app_id', appId);
    }
    const allMedia = [...coverFiles, ...screenshotFiles, ...videoFiles, ...docFiles];
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
    if (!user) { toast.error('请先登录'); return; }
    if (!form.url || !form.title) { toast.error('请填写应用链接和标题'); return; }
    if (!asDraft && !form.monetization_stage) { toast.error('请选择项目阶段'); return; }
    if (form.is_for_sale && !form.contact_info.trim()) {
      toast.error('出售项目需填写联系方式');
      return;
    }

    setLoading(true);
    try {
      const coverUrl = coverFiles.length > 0 ? coverFiles[0].file_url : null;
      const appData = {
        user_id: user.id,
        url: form.url,
        title: form.title,
        description: form.description,
        cover_image: coverUrl,
        tags: form.tags.split(/[,，、]/).map(t => t.trim()).filter(Boolean),
        tech_stack: form.tech_stack,
        prompt: form.prompt || null,
        monetization_stage: form.monetization_stage || null,
        is_for_sale: form.is_for_sale,
        price: form.is_for_sale ? (form.price || null) : null,
        contact_info: form.is_for_sale ? form.contact_info : null,
        status: asDraft ? 'draft' : 'pending',
        submitted_at: asDraft ? null : new Date().toISOString(),
      } as any;

      if (isEdit) {
        const { error } = await supabase.from('apps').update(appData).eq('id', editId!);
        if (error) throw error;
        await saveMedia(editId!);
        toast.success(asDraft ? '草稿已保存' : '已重新提交审核');
      } else {
        const { data, error } = await supabase.from('apps').insert(appData).select('id').single();
        if (error) throw error;
        await saveMedia(data.id);

        if (!asDraft) {
          // Award credits for submission
          await supabase.from('credit_transactions').insert({
            user_id: user.id,
            amount: 20,
            type: 'publish',
            description: '发布应用奖励',
          });
          await supabase.rpc('increment_app_views', { app_uuid: data.id }).then(() => {}); // no-op, just to trigger
          const { data: profileData } = await supabase.from('profiles').select('credits').eq('user_id', user.id).single();
          if (profileData) {
            await supabase.from('profiles').update({ credits: profileData.credits + 20 }).eq('user_id', user.id);
          }
          toast.success('应用提交成功！获得 20 积分 🎉');
        } else {
          toast.success('草稿已保存');
        }
      }
      navigate('/profile');
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-lg py-24 text-center space-y-4">
        <p className="text-muted-foreground">请先登录后再发布应用</p>
        <Link to="/auth"><Button className="bg-primary text-primary-foreground">去登录</Button></Link>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <Link to={isEdit ? '/profile' : '/'} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        返回
      </Link>

      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold mb-1">{isEdit ? '编辑应用' : '发布新应用'}</h1>
        <p className="text-sm text-muted-foreground">
          {isEdit ? '修改应用信息后可重新提交审核' : '分享你的 AI 应用，获得 20 积分奖励'}
        </p>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="animate-fade-up stagger-1 space-y-5">
        {/* Basic Info */}
        <div className="glass-card p-6 space-y-5">
          <div className="space-y-2">
            <Label>应用链接 *</Label>
            <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://your-app.lovable.app" className="bg-secondary/50 border-border/50" required />
          </div>
          <div className="space-y-2">
            <Label>应用标题 *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="给你的应用起一个吸引人的名字" className="bg-secondary/50 border-border/50" required />
          </div>
          <div className="space-y-2">
            <Label>应用描述</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="描述一下你的应用做了什么、解决了什么问题..." className="min-h-[120px] bg-secondary/50 border-border/50 resize-none" />
          </div>
          <div className="space-y-2">
            <Label>标签（用逗号分隔）</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="AI工具, 效率, 设计" className="bg-secondary/50 border-border/50" />
          </div>
          <div className="space-y-2">
            <Label>技术栈</Label>
            <div className="flex flex-wrap gap-2">
              {TECH_OPTIONS.map((tech) => (
                <button
                  key={tech}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      tech_stack: form.tech_stack.includes(tech)
                        ? form.tech_stack.filter((t) => t !== tech)
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
              Prompt / 工作流（可选）
            </Label>
            <Textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder="分享你使用的 Prompt 或工作流..." className="min-h-[100px] bg-secondary/50 border-border/50 resize-none font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <Label>项目阶段 *</Label>
            <Select value={form.monetization_stage} onValueChange={(v) => setForm({ ...form, monetization_stage: v })}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder="选择项目阶段" />
              </SelectTrigger>
              <SelectContent>
                {STAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span>{opt.label}</span>
                    <span className="ml-2 text-muted-foreground text-xs">{opt.desc}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Media Upload */}
        <div className="glass-card p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold mb-1">📸 媒体资料</h3>
            <p className="text-xs text-muted-foreground">上传封面图、截图、演示视频和文档</p>
          </div>
          <MediaUploader
            mediaType="cover"
            files={coverFiles}
            onChange={setCoverFiles}
            max={1}
            label="封面图（1张）"
            accept="image/*"
          />
          <MediaUploader
            mediaType="screenshot"
            files={screenshotFiles}
            onChange={setScreenshotFiles}
            max={6}
            label="应用截图（最多6张）"
            accept="image/*"
          />
          <MediaUploader
            mediaType="video"
            files={videoFiles}
            onChange={setVideoFiles}
            max={1}
            label="演示视频（1个）"
            accept="video/*"
          />
          <MediaUploader
            mediaType="document"
            files={docFiles}
            onChange={setDocFiles}
            max={5}
            label="文档附件（PDF等）"
            accept=".pdf,.doc,.docx"
          />
        </div>

        {/* Sale Section */}
        <div className="glass-card p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold mb-1">🏷️ 项目交易（可选）</h3>
            <p className="text-xs text-muted-foreground">如果你想出售此项目，可以在此标记</p>
          </div>
          <div className="flex items-center justify-between">
            <Label>是否出售该项目</Label>
            <Switch checked={form.is_for_sale} onCheckedChange={(v) => setForm({ ...form, is_for_sale: v })} />
          </div>
          {form.is_for_sale && (
            <div className="space-y-4 animate-fade-up">
              <div className="space-y-2">
                <Label>售价</Label>
                <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="例如：500元 / $99 / 面议" className="bg-secondary/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <Label>联系方式 *</Label>
                <Input value={form.contact_info} onChange={(e) => setForm({ ...form, contact_info: e.target.value })} placeholder="微信 / 邮箱 / Telegram" className="bg-secondary/50 border-border/50" required />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => handleSubmit(e as any, true)}
            disabled={loading}
            className="flex-1 gap-2 h-11"
          >
            <Save className="h-4 w-4" />
            保存草稿
          </Button>
          <Button type="submit" disabled={loading} className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11">
            <Send className="h-4 w-4" />
            {loading ? '提交中...' : isEdit ? '重新提交审核' : '提交审核'}
          </Button>
        </div>
      </form>
    </div>
  );
}
