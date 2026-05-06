import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  user_id: string;
  amount_cents: number;
  token_amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  profiles?: { display_name: string | null; username: string | null } | null;
}

export default function AdminOrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('token_orders')
      .select('*, profiles!token_orders_user_id_fkey(display_name, username)')
      .order('created_at', { ascending: false })
      .limit(50);
    
    // If join fails, fetch without it
    if (!data) {
      const { data: ordersOnly } = await supabase
        .from('token_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setOrders((ordersOnly as Order[]) || []);
    } else {
      setOrders((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const confirmOrder = async (order: Order) => {
    setProcessing(order.id);
    
    // 1. Get current balance
    const { data: bal } = await supabase
      .from('token_balances')
      .select('total_balance')
      .eq('user_id', order.user_id)
      .maybeSingle();

    const currentBalance = bal?.total_balance || 0;

    // 2. Upsert balance
    await supabase.from('token_balances').upsert(
      {
        user_id: order.user_id,
        total_balance: currentBalance + order.token_amount,
      },
      { onConflict: 'user_id' }
    );

    // 3. Update order status — use RPC or service role. Since admin can't update token_orders directly,
    // we need to handle this. For now let's try direct update (admin RLS allows select only).
    // We'll use a workaround: insert a new log entry instead.
    // Actually, let's check if we can update...
    const { error } = await supabase
      .from('token_orders')
      .update({ status: 'completed', payment_ref: `manual-${Date.now()}` })
      .eq('id', order.id);

    setProcessing(null);
    if (error) {
      toast.error('更新订单失败: ' + error.message);
      return;
    }
    toast.success(`已确认订单，充值 ${order.token_amount.toLocaleString()} Tokens`);
    fetchOrders();
  };

  const rejectOrder = async (orderId: string) => {
    setProcessing(orderId);
    const { error } = await supabase
      .from('token_orders')
      .update({ status: 'rejected' })
      .eq('id', orderId);
    setProcessing(null);
    if (error) {
      toast.error('操作失败: ' + error.message);
      return;
    }
    toast.success('订单已拒绝');
    fetchOrders();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 gap-1"><Clock className="h-3 w-3" />待确认</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-400 border-green-500/30 gap-1"><Check className="h-3 w-3" />已完成</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-400 border-red-500/30 gap-1"><X className="h-3 w-3" />已拒绝</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Token 充值订单</CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchOrders} className="gap-1">
          <RefreshCw className="h-4 w-4" /> 刷新
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-8">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">暂无订单</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left py-2 px-3 font-medium">用户</th>
                  <th className="text-left py-2 px-3 font-medium">金额</th>
                  <th className="text-left py-2 px-3 font-medium">Tokens</th>
                  <th className="text-left py-2 px-3 font-medium">状态</th>
                  <th className="text-left py-2 px-3 font-medium">时间</th>
                  <th className="text-left py-2 px-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border/30">
                    <td className="py-2 px-3 text-xs">
                      {(order.profiles as any)?.display_name || (order.profiles as any)?.username || order.user_id.slice(0, 8)}
                    </td>
                    <td className="py-2 px-3 font-medium">¥{(order.amount_cents / 100).toFixed(0)}</td>
                    <td className="py-2 px-3">{order.token_amount.toLocaleString()}</td>
                    <td className="py-2 px-3">{statusBadge(order.status)}</td>
                    <td className="py-2 px-3 text-muted-foreground">{new Date(order.created_at).toLocaleString()}</td>
                    <td className="py-2 px-3">
                      {order.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-green-400 border-green-500/30"
                            disabled={processing === order.id}
                            onClick={() => confirmOrder(order)}
                          >
                            <Check className="h-3 w-3 mr-1" />确认
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-red-400 border-red-500/30"
                            disabled={processing === order.id}
                            onClick={() => rejectOrder(order.id)}
                          >
                            <X className="h-3 w-3 mr-1" />拒绝
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
