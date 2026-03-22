import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AppCard from '@/components/AppCard';
import { Trophy, Heart, Bookmark, DollarSign } from 'lucide-react';

type Tab = 'likes' | 'favorites' | 'monetized';

const tabs: { key: Tab; label: string; icon: typeof Trophy }[] = [
  { key: 'likes', label: '热门榜', icon: Heart },
  { key: 'favorites', label: '收藏榜', icon: Bookmark },
  { key: 'monetized', label: '可变现榜', icon: DollarSign },
];

export default function Ranking() {
  const [activeTab, setActiveTab] = useState<Tab>('likes');

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['ranking', activeTab],
    queryFn: async () => {
      let query = supabase.from('apps').select('*').eq('status', 'approved');

      if (activeTab === 'likes') {
        query = query.order('likes_count', { ascending: false });
      } else if (activeTab === 'favorites') {
        query = query.order('favorites_count', { ascending: false });
      } else {
        query = query.eq('is_monetized', true).order('likes_count', { ascending: false });
      }

      const { data } = await query.limit(20);
      return data || [];
    },
  });

  return (
    <div className="container py-8 space-y-8">
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">排行榜</h1>
        </div>
        <p className="text-sm text-muted-foreground">最受欢迎的 AI 应用</p>
      </div>

      <div className="flex items-center gap-1 animate-fade-up stagger-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-secondary" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 rounded bg-secondary" />
                <div className="h-3 w-full rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {apps.map((app, i) => (
            <div key={app.id} className="relative">
              {i < 3 && (
                <div className="absolute -top-2 -left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-lg">
                  {i + 1}
                </div>
              )}
              <AppCard app={app} index={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
