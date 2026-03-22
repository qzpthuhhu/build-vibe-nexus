import { Globe, Smartphone, MessageSquareMore, Apple, TabletSmartphone, Monitor, Layers, HelpCircle } from 'lucide-react';

const PLATFORM_MAP: Record<string, { label: string; icon: React.ElementType }> = {
  web: { label: 'Web 网页端', icon: Globe },
  h5: { label: '手机 H5', icon: Smartphone },
  wechat_mini: { label: '微信小程序', icon: MessageSquareMore },
  ios: { label: 'iOS App', icon: Apple },
  android: { label: 'Android App', icon: TabletSmartphone },
  desktop: { label: '桌面端', icon: Monitor },
  multi: { label: '多平台', icon: Layers },
  other: { label: '其他', icon: HelpCircle },
};

export default function PlatformBadge({ platform }: { platform: string | null | undefined }) {
  if (!platform) return null;
  const info = PLATFORM_MAP[platform];
  if (!info) return null;
  const Icon = info.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Icon className="h-3 w-3" />
      {info.label}
    </span>
  );
}
