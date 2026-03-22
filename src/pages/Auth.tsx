import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success('登录成功');
        navigate('/');
      } else {
        await signUp(email, password, displayName);
        toast.success('注册成功！请查看邮箱验证链接');
      }
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 animate-fade-up">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Zap className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">{isLogin ? '欢迎回来' : '创建账户'}</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? '登录以发布和管理你的应用' : '注册即送 100 积分'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label>昵称</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="你的显示名称"
                className="bg-card border-border/50"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>邮箱</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="bg-card border-border/50"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>密码</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位字符"
              className="bg-card border-border/50"
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11"
          >
            {loading ? '处理中...' : isLogin ? '登录' : '注册'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? '还没有账户？' : '已有账户？'}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="ml-1 text-primary hover:underline font-medium"
          >
            {isLogin ? '去注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  );
}
