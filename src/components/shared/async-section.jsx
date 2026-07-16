import { CardSkeleton } from './card-skeleton';
import { ErrorState } from './error-state';
import { EmptyState } from './empty-state';

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
  if (isLoading) return loadingFallback ?? <CardSkeleton />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;

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
