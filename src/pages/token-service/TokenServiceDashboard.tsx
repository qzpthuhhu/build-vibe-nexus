import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import { Activity, Coins, Key, Zap, TrendingUp, Clock } from 'lucide-react';

// Mock chart data (will be replaced with real data from api_request_logs)
const usageData = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  tokens: Math.floor(Math.random() * 50000 + 10000),
  requests: Math.floor(Math.random() * 200 + 50),
}));

const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) => (
  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
    <CardContent className="p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function TokenServiceDashboard() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<{ total_balance: number; used_balance: number } | null>(null);
  const [keyCount, setKeyCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from('token_balances').select('total_balance, used_balance').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      setBalance(data as any);
    });
    supabase.from('api_keys').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active').then(({ count }) => {
      setKeyCount(count || 0);
    });
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Sign in to access your dashboard</h2>
          <Link to="/auth"><Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">Sign In</Button></Link>
        </div>
      </div>
    );
  }

  const remaining = (balance?.total_balance || 0) - (balance?.used_balance || 0);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Monitor your API usage and manage resources</p>
          </div>
          <Link to="/token-service/api-keys">
            <Button variant="outline" className="gap-2 border-purple-500/30">
              <Key className="h-4 w-4" /> Manage Keys
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Coins} label="Token Balance" value={remaining.toLocaleString()} sub="remaining" color="bg-purple-500/10 text-purple-400" />
          <StatCard icon={Activity} label="Requests Today" value="—" sub="today" color="bg-blue-500/10 text-blue-400" />
          <StatCard icon={Key} label="Active Keys" value={String(keyCount)} color="bg-cyan-500/10 text-cyan-400" />
          <StatCard icon={Clock} label="Avg Latency" value="—" sub="ms" color="bg-green-500/10 text-green-400" />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-400" /> Token Usage (14 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={usageData}>
                  <defs>
                    <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(270, 80%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(270, 80%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: 'hsl(160,5%,52%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(160,5%,52%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'hsl(160,15%,7%)', border: '1px solid hsl(160,8%,14%)', borderRadius: 8, color: '#fff' }} />
                  <Area type="monotone" dataKey="tokens" stroke="hsl(270, 80%, 60%)" fill="url(#tokenGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-400" /> Requests (14 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={usageData}>
                  <XAxis dataKey="date" tick={{ fill: 'hsl(160,5%,52%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(160,5%,52%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'hsl(160,15%,7%)', border: '1px solid hsl(160,8%,14%)', borderRadius: 8, color: '#fff' }} />
                  <Bar dataKey="requests" fill="hsl(220, 80%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Requests */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Recent Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              No requests yet. Create an API key and start making calls to see your activity here.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
