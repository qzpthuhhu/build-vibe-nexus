import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Send, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const TECH_OPTIONS = ['Lovable', 'Cursor', 'Dify', 'LangChain', 'OpenAI', 'Claude', 'V0', 'Bolt', 'Replit', '其他'];

export default function Submit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    url: '',
    title: '',
    description: '',
    cover_image: '',
    tags: '',
    tech_stack: [] as string[],
    prompt: '',
    is_monetized: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('请先登录'); return; }
    if (!form.url || !form.title) { toast.error('请填写应用链接和标题'); return; }

    setLoading(true);
    try {
      const { error } = await supabase.from('apps').insert({
        user_id: user.id,
        url: form.url,
        title: form.title,
        description: form.description,
        cover_image: form.cover_image || null,
        tags: form.tags.split(/[,，、]/).map(t => t.trim()).filter(Boolean),
        tech_stack: form.tech_stack,
        prompt: form.prompt || null,
        is_monetized: form.is_monetized,
      });

      if (error) throw error;

      // Award credits
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: 20,
        type: 'publish',
        description: '发布应用奖励',
      });
      await supabase
        .from('profiles')
        .update({ credits: (await supabase.from('profiles').select('credits').eq('user_id', user.id).single()).data!.credits + 20 })
        .eq('user_id', user.id);

      toast.success('应用发布成功！获得 20 积分 🎉');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || '发布失败');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-lg py-24 text-center space-y-4">
        <p className="text-muted-foreground">请先登录后再发布应用</p>
        <Link to="/auth">
          <Button className="bg-primary text-primary-foreground">去登录</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        返回
      </Link>

      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold mb-1">发布新应用</h1>
        <p className="text-sm text-muted-foreground">分享你的 AI 应用，获得 20 积分奖励</p>
      </div>

      <form onSubmit={handleSubmit} className="animate-fade-up stagger-1 space-y-5">
        <div className="glass-card p-6 space-y-5">
          <div className="space-y-2">
            <Label>应用链接 *</Label>
            <Input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://your-app.lovable.app"
              className="bg-secondary/50 border-border/50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>应用标题 *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="给你的应用起一个吸引人的名字"
              className="bg-secondary/50 border-border/50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>应用描述</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="描述一下你的应用做了什么、解决了什么问题..."
              className="min-h-[120px] bg-secondary/50 border-border/50 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>封面图链接</Label>
            <Input
              value={form.cover_image}
              onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
              placeholder="https://example.com/cover.png"
              className="bg-secondary/50 border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label>标签（用逗号分隔）</Label>
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="AI工具, 效率, 设计"
              className="bg-secondary/50 border-border/50"
            />
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
            <Textarea
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              placeholder="分享你使用的 Prompt 或工作流..."
              className="min-h-[100px] bg-secondary/50 border-border/50 resize-none font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>此应用可变现</Label>
            <Switch
              checked={form.is_monetized}
              onCheckedChange={(v) => setForm({ ...form, is_monetized: v })}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11"
        >
          <Send className="h-4 w-4" />
          {loading ? '发布中...' : '发布应用'}
        </Button>
      </form>
    </div>
  );
}
