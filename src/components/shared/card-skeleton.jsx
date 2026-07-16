import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function CardSkeleton({ lines = 3 }) {
  return (
    <div role="status" className="rounded-xl border border-border bg-surface p-5 space-y-3">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-3 w-24" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === 0 ? 'w-full' : i === lines - 1 ? 'w-1/3' : 'w-3/4')}
        />
      ))}
    </div>
  );
}
