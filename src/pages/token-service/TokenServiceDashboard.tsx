import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import { Activity, Coins, Key, Zap, TrendingUp, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

interface DayData { date: string; tokens: number; requests: number; }
interface LogRow { id: string; model_requested: string; total_tokens: number; status_code: number; latency_ms: number; created_at: string; is_stream: boolean; }

export default function TokenServiceDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [balance, setBalance] = useState<{ total_balance: number; used_balance: number } | null>(null);
  const [keyCount, setKeyCount] = useState(0);
  const [todayRequests, setTodayRequests] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);
  const [usageData, setUsageData] = useState<DayData[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogRow[]>([]);

  useEffect(() => {
    if (!user) return;

    // Balance
    supabase.from('token_balances').select('total_balance, used_balance').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      setBalance(data as any);
    });

    // Key count
    supabase.from('api_keys').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active').then(({ count }) => {
      setKeyCount(count || 0);
    });

    // Recent logs (last 20)
    supabase.from('api_request_logs').select('id, model_requested, total_tokens, status_code, latency_ms, created_at, is_stream')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => {
        const rows = (data || []) as LogRow[];
        setRecentLogs(rows);

        // Today stats
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayRows = rows.filter(r => new Date(r.created_at) >= todayStart);
        setTodayRequests(todayRows.length);
        if (todayRows.length > 0) {
          setAvgLatency(Math.round(todayRows.reduce((s, r) => s + (r.latency_ms || 0), 0) / todayRows.length));
        }
      });

    // Usage chart: last 14 days aggregation
    const fourteenDaysAgo = new Date(Date.now() - 13 * 86400000);
    fourteenDaysAgo.setHours(0, 0, 0, 0);
    supabase.from('api_request_logs').select('total_tokens, created_at')
      .eq('user_id', user.id).gte('created_at', fourteenDaysAgo.toISOString())
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const dayMap: Record<string, DayData> = {};
        for (let i = 0; i < 14; i++) {
          const d = new Date(Date.now() - (13 - i) * 86400000);
          const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          dayMap[key] = { date: key, tokens: 0, requests: 0 };
        }
        for (const row of (data || []) as any[]) {
          const d = new Date(row.created_at);
          const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (dayMap[key]) {
            dayMap[key].tokens += row.total_tokens || 0;
            dayMap[key].requests += 1;
          }
        }
        setUsageData(Object.values(dayMap));
      });
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">{t('token_service.dashboard_sign_in_title')}</h2>
          <Link to="/auth"><Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">{t('token_service.dashboard_sign_in')}</Button></Link>
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
            <h1 className="text-2xl font-bold text-foreground">{t('token_service.dashboard_title')}</h1>
            <p className="text-sm text-muted-foreground">{t('token_service.dashboard_subtitle')}</p>
          </div>
          <Link to="/token-service/api-keys">
            <Button variant="outline" className="gap-2 border-purple-500/30">
              <Key className="h-4 w-4" /> {t('token_service.dashboard_manage_keys')}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Coins} label={t('token_service.dashboard_token_balance')} value={remaining.toLocaleString()} sub={t('token_service.dashboard_remaining')} color="bg-purple-500/10 text-purple-400" />
          <StatCard icon={Activity} label={t('token_service.dashboard_requests_today')} value={String(todayRequests)} sub={t('token_service.dashboard_today')} color="bg-blue-500/10 text-blue-400" />
          <StatCard icon={Key} label={t('token_service.dashboard_active_keys')} value={String(keyCount)} color="bg-cyan-500/10 text-cyan-400" />
          <StatCard icon={Clock} label={t('token_service.dashboard_avg_latency')} value={avgLatency ? String(avgLatency) : '—'} sub="ms" color="bg-green-500/10 text-green-400" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-400" /> {t('token_service.dashboard_token_usage')}
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
                <Zap className="h-4 w-4 text-blue-400" /> {t('token_service.dashboard_requests_chart')}
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

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">{t('token_service.dashboard_recent_requests')}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                {t('token_service.dashboard_no_requests')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="text-left py-2 px-3 font-medium">模型</th>
                      <th className="text-left py-2 px-3 font-medium">Tokens</th>
                      <th className="text-left py-2 px-3 font-medium">状态</th>
                      <th className="text-left py-2 px-3 font-medium">延迟</th>
                      <th className="text-left py-2 px-3 font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border/30">
                        <td className="py-2 px-3 font-mono text-purple-400 text-xs">{log.model_requested}</td>
                        <td className="py-2 px-3">{log.total_tokens.toLocaleString()}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${log.status_code === 200 ? 'bg-green-400' : 'bg-red-400'}`} />
                          {log.status_code}
                        </td>
                        <td className="py-2 px-3">{log.latency_ms}ms</td>
                        <td className="py-2 px-3 text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
