import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  offline: 'bg-muted text-muted-foreground border-border',
};

export default function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const style = STATUS_STYLES[status] || '';
  const label = t(`status.${status}`, status);

  return (
    <Badge variant="outline" className={`text-[10px] px-2 py-0 ${style}`}>
      {label}
    </Badge>
  );
}
