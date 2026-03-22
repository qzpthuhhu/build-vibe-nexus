import { Link } from 'react-router-dom';
import { Heart, Eye, Bookmark } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface AppCardProps {
  app: Tables<'apps'> & { profiles?: { display_name: string | null } | null };
  index?: number;
}

export default function AppCard({ app, index = 0 }: AppCardProps) {
  return (
    <Link
      to={`/app/${app.id}`}
      className={`group glass-card hover-lift overflow-hidden animate-fade-up stagger-${Math.min(index % 4, 4)}`}
    >
      <div className="aspect-[16/10] relative overflow-hidden bg-secondary">
        {app.cover_image ? (
          <img
            src={app.cover_image}
            alt={app.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20">
            <span className="text-3xl font-bold text-primary/30">{app.title[0]}</span>
          </div>
        )}
        {(app as any).is_for_sale && (
          <span className="absolute top-2.5 right-2.5 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            💸 出售中
          </span>
        )}
        {app.is_boosted && (
          <span className="absolute top-2.5 left-2.5 rounded-md bg-primary/90 px-2 py-0.5 text-xs font-medium text-primary-foreground backdrop-blur-sm">
            🔥 推荐
          </span>
        )}
      </div>

      <div className="p-4 space-y-2.5">
        <h3 className="font-semibold text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
          {app.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {app.description}
        </p>

        {app.tags && app.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {app.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" /> {app.likes_count}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {app.views}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Bookmark className="h-3 w-3" /> {app.favorites_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
