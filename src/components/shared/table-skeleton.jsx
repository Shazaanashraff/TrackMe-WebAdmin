import { Skeleton } from '@/components/ui/skeleton';

export function TableSkeleton({ rows = 8, cols = 4 }) {
  return (
    <div role="status" className="w-full">
      <span className="sr-only">Loading…</span>
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
          {Array.from({ length: cols }, (_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
