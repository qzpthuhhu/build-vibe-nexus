import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useAdmin } from '@/hooks/use-admin';
import { Button } from '@/components/ui/button';
import { Plus, User, LogOut, Coins, Shield, Zap } from 'lucide-react';
import VibeDirLogo from '@/components/VibeDirLogo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const isTokenService = location.pathname.startsWith('/token-service');

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <VibeDirLogo size={28} />
            <span className="text-lg font-bold tracking-tight text-gradient">VibeDir</span>
          </Link>

          {/* Token Service sub-nav */}
          {isTokenService && (
            <div className="hidden md:flex items-center gap-1 ml-2">
              <span className="text-muted-foreground/40 mr-2">/</span>
              {[
                { to: '/token-service', label: 'Token Service' },
                { to: '/token-service/docs', label: 'Docs' },
                { to: '/token-service/pricing', label: 'Pricing' },
                { to: '/token-service/playground', label: 'Playground' },
                { to: '/token-service/dashboard', label: 'Dashboard' },
              ].map((item) => (
                <Link key={item.to} to={item.to}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-sm ${
                      location.pathname === item.to
                        ? 'text-foreground bg-accent/50'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isTokenService && (
            <>
              <Link to="/ranking">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  {t('nav.ranking')}
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  {t('nav.contact')}
                </Button>
              </Link>
            </>
          )}

          <Link to="/token-service">
            <Button variant="ghost" size="sm" className="gap-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10">
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Token Service</span>
            </Button>
          </Link>

          <LanguageSwitcher />

          {user ? (
            <>
              {!isTokenService && (
                <Link to="/submit">
                  <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-3.5 w-3.5" />
                    {t('nav.submit')}
                  </Button>
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {profile?.display_name?.[0] || 'U'}
                    </div>
                    <span className="hidden sm:inline text-sm">{profile?.display_name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Coins className="h-3.5 w-3.5 text-primary" />
                      <span>{profile?.credits ?? 0} {t('nav.credits')}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    {t('nav.profile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/token-service/dashboard')}>
                    <Zap className="mr-2 h-4 w-4" />
                    Token Dashboard
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="mr-2 h-4 w-4" />
                      {t('nav.admin')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                {t('nav.login')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
