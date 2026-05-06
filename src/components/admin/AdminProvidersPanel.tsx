import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Server, Key, ArrowRightLeft, Plus, Pencil, Save, X, Zap,
  Globe, Shield, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

interface Provider {
  id: string;
  name: string;
  slug: string;
  base_url_openai: string | null;
  base_url_anthropic: string | null;
  api_key_ref: string;
  is_active: boolean;
  config: any;
}

interface ModelMapping {
  id: string;
  source_model: string;
  target_model: string;
  provider: string;
  provider_id: string | null;
  is_active: boolean;
  priority: number;
  config: any;
}

export default function AdminProvidersPanel() {
  const queryClient = useQueryClient();
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [newProvider, setNewProvider] = useState(false);
  const [providerForm, setProviderForm] = useState({
    name: '', slug: '', base_url_openai: '', base_url_anthropic: '', api_key_ref: '', is_active: true,
  });
  const [mappingForm, setMappingForm] = useState({
    source_model: '', target_model: '', cost_multiplier: '1.0', format: 'openai', display_name: '',
  });

  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['admin-providers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ai_providers').select('*').order('created_at');
      if (error) throw error;
      return data as Provider[];
    },
  });

  const { data: mappings = [], isLoading: mappingsLoading } = useQuery({
    queryKey: ['admin-model-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('model_mappings').select('*').order('source_model');
      if (error) throw error;
      return data as ModelMapping[];
    },
  });

  const toggleProviderActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('ai_providers').update({ is_active } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
      toast.success('供应商状态已更新');
    },
  });

  const saveProvider = useMutation({
    mutationFn: async (form: typeof providerForm & { id?: string }) => {
      const payload: any = {
        name: form.name,
        slug: form.slug,
        base_url_openai: form.base_url_openai || null,
        base_url_anthropic: form.base_url_anthropic || null,
        api_key_ref: form.api_key_ref,
        is_active: form.is_active,
      };
      if (form.id) {
        const { error } = await supabase.from('ai_providers').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_providers').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
      setEditingProvider(null);
      setNewProvider(false);
      toast.success('供应商已保存');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMappingActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('model_mappings').update({ is_active } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-model-mappings'] });
      toast.success('映射状态已更新');
    },
  });

  const saveMappingConfig = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: any }) => {
      const { error } = await supabase.from('model_mappings').update({ config } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-model-mappings'] });
      setEditingMapping(null);
      toast.success('映射配置已保存');
    },
  });

  const startEditProvider = (p: Provider) => {
    setEditingProvider(p.id);
    setProviderForm({
      name: p.name,
      slug: p.slug,
      base_url_openai: p.base_url_openai || '',
      base_url_anthropic: p.base_url_anthropic || '',
      api_key_ref: p.api_key_ref,
      is_active: p.is_active,
    });
  };

  const startEditMapping = (m: ModelMapping) => {
    setEditingMapping(m.id);
    setMappingForm({
      source_model: m.source_model,
      target_model: m.target_model,
      cost_multiplier: String(m.config?.cost_multiplier ?? 1.0),
      format: m.config?.format || 'openai',
      display_name: m.config?.display_name || '',
    });
  };

  const maskKey = (ref: string) => ref ? `${ref.slice(0, 4)}****` : '未配置';

  if (providersLoading || mappingsLoading) {
    return <div className="text-center py-8 text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-up stagger-2">
      {/* Providers Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            服务商管理
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setNewProvider(true);
              setProviderForm({ name: '', slug: '', base_url_openai: '', base_url_anthropic: '', api_key_ref: '', is_active: true });
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> 添加供应商
          </Button>
        </div>

        {/* New Provider Form */}
        {newProvider && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <h3 className="text-sm font-medium">新建供应商</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="名称 (如 MiniMax)" value={providerForm.name} onChange={e => setProviderForm(f => ({ ...f, name: e.target.value }))} />
              <Input placeholder="标识 (如 minimax)" value={providerForm.slug} onChange={e => setProviderForm(f => ({ ...f, slug: e.target.value }))} />
              <Input placeholder="OpenAI 兼容 URL" value={providerForm.base_url_openai} onChange={e => setProviderForm(f => ({ ...f, base_url_openai: e.target.value }))} />
              <Input placeholder="Anthropic 兼容 URL" value={providerForm.base_url_anthropic} onChange={e => setProviderForm(f => ({ ...f, base_url_anthropic: e.target.value }))} />
              <Input placeholder="API Key Secret 名称" value={providerForm.api_key_ref} onChange={e => setProviderForm(f => ({ ...f, api_key_ref: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveProvider.mutate(providerForm)}><Save className="h-3 w-3 mr-1" /> 保存</Button>
              <Button size="sm" variant="ghost" onClick={() => setNewProvider(false)}><X className="h-3 w-3 mr-1" /> 取消</Button>
            </div>
          </div>
        )}

        {/* Provider Cards */}
        {providers.map(p => (
          <div key={p.id} className="rounded-lg border border-border/50 bg-secondary/30 overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => setExpandedProvider(expandedProvider === p.id ? null : p.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ${p.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-medium">{p.name}</span>
                <Badge variant="outline" className="text-xs">{p.slug}</Badge>
                <Badge variant="secondary" className="text-xs">
                  <Key className="h-3 w-3 mr-1" /> {maskKey(p.api_key_ref)}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={p.is_active}
                  onCheckedChange={v => { toggleProviderActive.mutate({ id: p.id, is_active: v }); }}
                  onClick={e => e.stopPropagation()}
                />
                {expandedProvider === p.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>

            {expandedProvider === p.id && (
              <div className="border-t border-border/30 p-4 space-y-3">
                {editingProvider === p.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">名称</label>
                        <Input value={providerForm.name} onChange={e => setProviderForm(f => ({ ...f, name: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">标识</label>
                        <Input value={providerForm.slug} onChange={e => setProviderForm(f => ({ ...f, slug: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">OpenAI 兼容端点</label>
                        <Input value={providerForm.base_url_openai} onChange={e => setProviderForm(f => ({ ...f, base_url_openai: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Anthropic 兼容端点</label>
                        <Input value={providerForm.base_url_anthropic} onChange={e => setProviderForm(f => ({ ...f, base_url_anthropic: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">API Key Secret 名称</label>
                        <Input value={providerForm.api_key_ref} onChange={e => setProviderForm(f => ({ ...f, api_key_ref: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveProvider.mutate({ ...providerForm, id: p.id })}><Save className="h-3 w-3 mr-1" /> 保存</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingProvider(null)}><X className="h-3 w-3 mr-1" /> 取消</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">OpenAI 端点：</span>
                        <span className="ml-1 font-mono text-xs">{p.base_url_openai || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Anthropic 端点：</span>
                        <span className="ml-1 font-mono text-xs">{p.base_url_anthropic || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Secret 引用：</span>
                        <span className="ml-1 font-mono text-xs">{p.api_key_ref}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => startEditProvider(p)}>
                      <Pencil className="h-3 w-3 mr-1" /> 编辑
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Model Mappings Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          模型映射 & Token 定价
        </h2>
        <p className="text-sm text-muted-foreground">
          Token 单价倍率用于计费：用户消耗的 Token × 倍率 = 实际扣除 Token 数。使用 <code className="text-xs bg-secondary px-1 py-0.5 rounded">js-tiktoken (cl100k_base)</code> 编码计数。
        </p>

        <div className="rounded-lg border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">对外模型名</th>
                <th className="px-4 py-2.5 text-left font-medium">实际模型</th>
                <th className="px-4 py-2.5 text-left font-medium">格式</th>
                <th className="px-4 py-2.5 text-center font-medium">Token 倍率</th>
                <th className="px-4 py-2.5 text-center font-medium">状态</th>
                <th className="px-4 py-2.5 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {mappings.map(m => (
                <tr key={m.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.config?.display_name || m.source_model}</div>
                    <div className="text-xs text-muted-foreground font-mono">{m.source_model}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{m.target_model}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {m.config?.format === 'anthropic' ? (
                        <><Globe className="h-3 w-3 mr-1" /> Anthropic</>
                      ) : (
                        <><Zap className="h-3 w-3 mr-1" /> OpenAI</>
                      )}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingMapping === m.id ? (
                      <Input
                        type="number"
                        step="0.1"
                        className="w-20 text-center mx-auto h-7 text-xs"
                        value={mappingForm.cost_multiplier}
                        onChange={e => setMappingForm(f => ({ ...f, cost_multiplier: e.target.value }))}
                      />
                    ) : (
                      <Badge variant={Number(m.config?.cost_multiplier) > 1 ? 'default' : 'secondary'} className="text-xs">
                        ×{m.config?.cost_multiplier ?? 1.0}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={m.is_active}
                      onCheckedChange={v => toggleMappingActive.mutate({ id: m.id, is_active: v })}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingMapping === m.id ? (
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            saveMappingConfig.mutate({
                              id: m.id,
                              config: {
                                ...m.config,
                                cost_multiplier: parseFloat(mappingForm.cost_multiplier) || 1.0,
                                display_name: mappingForm.display_name || m.config?.display_name,
                              },
                            });
                          }}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingMapping(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => startEditMapping(m)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Token Counting Info */}
      <div className="rounded-lg border border-border/50 bg-secondary/20 p-4 space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Token 计数技术
        </h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 使用 <code className="bg-secondary px-1 py-0.5 rounded">js-tiktoken</code> 纯 JS 实现，兼容 Deno Edge Runtime</p>
          <p>• 编码方式：<code className="bg-secondary px-1 py-0.5 rounded">cl100k_base</code>（GPT-4 / Claude 通用标准）</p>
          <p>• 每次 API 请求分别计数 prompt_tokens + completion_tokens</p>
          <p>• 实际扣费 = total_tokens × 模型对应的 cost_multiplier</p>
        </div>
      </div>
    </div>
  );
}
