import { cn } from '@/shared/lib/cn';

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('skeleton-shimmer animate-shimmer rounded-control', className)} aria-hidden="true" />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <SkeletonBlock className="h-4 w-32" />
      <SkeletonBlock className="mt-4 h-7 w-24" />
      <SkeletonBlock className="mt-3 h-4 w-full" />
    </div>
  );
}

export function ChainCardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex gap-4">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <SkeletonBlock className="h-7 w-16" />
          <SkeletonBlock className="h-6 w-1" />
          <SkeletonBlock className="h-7 w-16" />
        </div>
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-5 w-full" />
          <div className="mt-4 flex gap-2">
            <SkeletonBlock className="h-6 w-16 rounded-pill" />
            <SkeletonBlock className="h-6 w-32 rounded-pill" />
            <SkeletonBlock className="h-6 w-24 rounded-pill" />
          </div>
          <SkeletonBlock className="mt-4 h-4 w-full" />
          <SkeletonBlock className="mt-2 h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-card border border-border bg-surface">
      <div className="border-b border-border p-4">
        <SkeletonBlock className="h-4 w-40" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="grid grid-cols-6 gap-4 border-b border-border p-4 last:border-b-0">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-12" />
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
