import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success(t('auth.login_success'));
        navigate('/');
      } else {
        await signUp(email, password, displayName);
        toast.success(t('auth.signup_success'));
      }
    } catch (err: any) {
      toast.error(err.message || t('auth.operation_failed'));
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
          <h1 className="text-2xl font-bold">{isLogin ? t('auth.welcome_back') : t('auth.create_account')}</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? t('auth.login_desc') : t('auth.signup_desc')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label>{t('auth.nickname')}</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('auth.nickname_placeholder')}
                className="bg-card border-border/50"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>{t('auth.email')}</Label>
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
            <Label>{t('auth.password')}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.password_placeholder')}
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
            {loading ? t('auth.processing') : isLogin ? t('auth.login_btn') : t('auth.signup_btn')}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? t('auth.no_account') : t('auth.has_account')}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="ml-1 text-primary hover:underline font-medium"
          >
            {isLogin ? t('auth.go_signup') : t('auth.go_login')}
          </button>
        </p>
      </div>
    </div>
  );
}
