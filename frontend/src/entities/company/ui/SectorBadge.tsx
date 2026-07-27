import { cn } from '@/shared/lib/cn';

export function SectorBadge({ sector, className }: { sector: string; className?: string }) {
  return (
    <span className={cn('inline-flex rounded-pill bg-surface-raised px-2.5 py-1 text-small text-text-secondary', className)}>
      {sector}
    </span>
  );
}
