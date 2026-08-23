import { CardSkeleton } from './card-skeleton';
import { ErrorState } from './error-state';
import { EmptyState } from './empty-state';
import { OfflineCard } from './offline-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOnlineStatus } from '@/hooks/use-online-status';

export function AsyncSection({
  isLoading,
  error,
  data,
  isEmpty,
  onRetry,
  loadingFallback,
  emptyIcon,
  emptyTitle = 'No data yet',
  emptyDescription,
  emptyAction,
  children,
}) {
  const isOnline = useOnlineStatus();

  if (isLoading) return loadingFallback ?? <CardSkeleton />;

  const hasData = Array.isArray(data) ? data.length > 0 : data != null;

  if (error) {
    // A background refetch failing after a successful initial load shouldn't
    // discard what's already on screen — that's strictly worse than doing
    // nothing. Keep the last-known-good content and say so; only replace it
    // with the full error state when there was never anything to show
    // (issue #21). Being offline isn't a failure, so it gets its own calm
    // wording instead of the "couldn't refresh" one used for a real error —
    // the two look identical to a query, but mean very different things to
    // whoever's staring at the amber strip.
    if (hasData) {
      return (
        <div className="space-y-3">
          <Alert variant="warning">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>
                {isOnline
                  ? "Couldn't refresh — showing last known data."
                  : 'Offline — showing saved information.'}
              </span>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="shrink-0 underline underline-offset-2 hover:no-underline"
                >
                  Retry
                </button>
              )}
            </AlertDescription>
          </Alert>
          {children}
        </div>
      );
    }
    if (!isOnline) return <OfflineCard onRetry={onRetry} />;
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  const empty = isEmpty ?? (Array.isArray(data) ? data.length === 0 : data == null);
  if (empty) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return children;
}
