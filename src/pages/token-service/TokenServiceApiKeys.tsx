import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Copy, Trash2, Key, Check, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  status: string;
  total_requests: number;
  total_tokens_used: number;
  created_at: string;
  last_used_at: string | null;
}

function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'vb-sk-';
  for (let i = 0; i < 48; i++) key += chars[Math.floor(Math.random() * chars.length)];
  return key;
}

async function hashKey(key: string): Promise<string> {
  const enc = new TextEncoder().encode(key);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function TokenServiceApiKeys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setKeys((data as ApiKey[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, [user]);

  const createKey = async () => {
    if (!user) return;
    const raw = generateApiKey();
    const hash = await hashKey(raw);
    const prefix = raw.slice(0, 12) + '...';

    const { error } = await supabase.from('api_keys').insert({
      user_id: user.id,
      name: newKeyName || 'Default Key',
      key_prefix: prefix,
      key_hash: hash,
    });

    if (error) {
      toast.error('Failed to create key');
      return;
    }

    // Also init token balance if not exists
    await supabase.from('token_balances').upsert({
      user_id: user.id,
      total_balance: 10000,
      used_balance: 0,
    }, { onConflict: 'user_id' });

    setNewKeyValue(raw);
    fetchKeys();
    toast.success('API key created');
  };

  const revokeKey = async (id: string) => {
    await supabase.from('api_keys').update({ status: 'revoked' }).eq('id', id);
    toast.success('Key revoked');
    fetchKeys();
  };

  const copyKey = () => {
    navigator.clipboard.writeText(newKeyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Sign in to manage API keys</h2>
          <Link to="/auth"><Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">Sign In</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
            <p className="text-sm text-muted-foreground">Manage your API keys for accessing the Token Service</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setNewKeyValue(''); setNewKeyName(''); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0">
                <Plus className="h-4 w-4" /> Create Key
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {newKeyValue ? 'Your New API Key' : 'Create API Key'}
                </DialogTitle>
              </DialogHeader>
              {newKeyValue ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Copy this key now. You won't be able to see it again.
                  </p>
                  <div className="flex gap-2">
                    <Input value={newKeyValue} readOnly className="font-mono text-xs bg-background" />
                    <Button variant="outline" size="icon" onClick={copyKey}>
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button className="w-full" onClick={() => { setDialogOpen(false); setNewKeyValue(''); setNewKeyName(''); }}>Done</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    placeholder="Key name (e.g., production, dev)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="bg-background"
                  />
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0" onClick={createKey}>
                    Generate Key
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Keys list */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center text-muted-foreground py-12">Loading...</div>
          ) : keys.length === 0 ? (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="py-12 text-center">
                <Key className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground">No API keys yet. Create one to get started.</p>
              </CardContent>
            </Card>
          ) : (
            keys.map((k) => (
              <Card key={k.id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${k.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{k.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{k.key_prefix}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">{k.total_requests.toLocaleString()} requests</p>
                      <p className="text-xs text-muted-foreground">{k.total_tokens_used.toLocaleString()} tokens</p>
                    </div>
                    <div className="text-xs text-muted-foreground hidden md:block">
                      {new Date(k.created_at).toLocaleDateString()}
                    </div>
                    {k.status === 'active' && (
                      <Button variant="ghost" size="icon" onClick={() => revokeKey(k.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
