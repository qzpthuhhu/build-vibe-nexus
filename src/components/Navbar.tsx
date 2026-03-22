import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useAdmin } from '@/hooks/use-admin';
import { Button } from '@/components/ui/button';
import { Plus, User, LogOut, Coins, Shield } from 'lucide-react';
import VibeDirLogo from '@/components/VibeDirLogo';
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

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <VibeDirLogo size={28} />
          <span className="text-lg font-bold tracking-tight text-gradient">VibeDir</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/ranking">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              排行榜
            </Button>
          </Link>

          {user ? (
            <>
              <Link to="/submit">
                <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-3.5 w-3.5" />
                  发布应用
                </Button>
              </Link>

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
                      <span>{profile?.credits ?? 0} 积分</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    个人主页
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="mr-2 h-4 w-4" />
                      管理后台
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                登录
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
