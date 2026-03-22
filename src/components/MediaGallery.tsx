import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MediaGalleryProps {
  appId: string;
}

export default function MediaGallery({ appId }: MediaGalleryProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const { data: media = [] } = useQuery({
    queryKey: ['app-media', appId],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_media')
        .select('*')
        .eq('app_id', appId)
        .order('sort_order', { ascending: true });
      return data || [];
    },
  });

  const screenshots = media.filter((m: any) => m.media_type === 'screenshot');
  const videos = media.filter((m: any) => m.media_type === 'video');
  const documents = media.filter((m: any) => m.media_type === 'document');

  if (media.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Screenshot Carousel */}
      {screenshots.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">应用截图</h3>
          <div className="relative">
            <div className="overflow-hidden rounded-xl border border-border/50">
              <div className="aspect-video">
                <img
                  src={screenshots[currentSlide]?.file_url}
                  alt={screenshots[currentSlide]?.file_name}
                  className="h-full w-full object-contain bg-secondary/30"
                />
              </div>
            </div>
            {screenshots.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                  onClick={() => setCurrentSlide((p) => (p === 0 ? screenshots.length - 1 : p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                  onClick={() => setCurrentSlide((p) => (p === screenshots.length - 1 ? 0 : p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="flex justify-center gap-1.5 mt-3">
                  {screenshots.map((_: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === currentSlide ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Video */}
      {videos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">演示视频</h3>
          {videos.map((v: any) => (
            <div key={v.id} className="rounded-xl border border-border/50 overflow-hidden">
              <video controls className="w-full aspect-video bg-secondary/30">
                <source src={v.file_url} type="video/mp4" />
                您的浏览器不支持视频播放
              </video>
            </div>
          ))}
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">附件文档</h3>
          <div className="space-y-2">
            {documents.map((d: any) => (
              <a
                key={d.id}
                href={d.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3 hover:bg-secondary/50 transition-colors"
              >
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{d.file_name}</span>
                <Download className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
