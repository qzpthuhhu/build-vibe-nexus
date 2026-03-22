import { Badge } from '@/components/ui/badge';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-muted text-muted-foreground border-border' },
  pending: { label: '待审核', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  approved: { label: '已通过', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  rejected: { label: '已打回', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  offline: { label: '已下线', className: 'bg-muted text-muted-foreground border-border' },
};

export default function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, className: '' };
  return (
    <Badge variant="outline" className={`text-[10px] px-2 py-0 ${s.className}`}>
      {s.label}
    </Badge>
  );
}
