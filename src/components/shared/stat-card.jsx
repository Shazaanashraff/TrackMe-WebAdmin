import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function formatAsOf(when) {
  if (!when) return null;
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Colombo',
  }).format(new Date(when));
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  isLoading,
  isError,
  href,
  // `stale` + `asOf` (a timestamp, e.g. a query's dataUpdatedAt) render the
  // last-known number greyed with an "as of HH:MM" line. Used offline instead
  // of `isError`, so a dropped connection shows the cached count rather than a
  // red dash.
  stale = false,
  asOf,
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-28" />
      </div>
    );
  }

  const body = (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <div className="h-9 w-9 rounded-lg bg-surface-muted flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
          </div>
        )}
      </div>
      <div className="space-y-1">
        <span
          className={cn(
            'block text-3xl font-bold font-mono tabular-nums leading-none',
            isError ? 'text-status-danger' : stale ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {isError ? '—' : value}
        </span>
        {isError && <p className="text-xs text-status-danger">Failed to load</p>}
        {!isError && stale && asOf && (
          <p className="text-xs text-muted-foreground">as of {formatAsOf(asOf)}</p>
        )}
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs',
              trend.direction === 'up' ? 'text-status-settled' : 'text-status-danger',
            )}
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3 w-3" aria-hidden />
            ) : (
              <TrendingDown className="h-3 w-3" aria-hidden />
            )}
            <span>{trend.value}</span>
          </div>
        )}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        to={href}
        className="block hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      >
        {body}
      </Link>
    );
  }
  return body;
}
