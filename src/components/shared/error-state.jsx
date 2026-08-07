import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function humanizeError(error) {
  if (!error) return 'An unexpected error occurred.';
  if (typeof error === 'string') return error;
  const msg = String(error.message || '');
  if (/network|failed to fetch/i.test(msg)) return 'Network error. Check your connection and try again.';
  if (/401|unauthorized/i.test(msg)) return 'Session expired. Please log in again.';
  if (/403|forbidden/i.test(msg)) return "You don't have permission to view this.";
  if (/404|not found/i.test(msg)) return 'The requested resource was not found.';
  if (/5\d{2}|server error/i.test(msg)) return 'Server error. Please try again in a moment.';
  return msg || 'An unexpected error occurred.';
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="h-12 w-12 rounded-xl bg-status-danger/10 flex items-center justify-center">
        <AlertCircle className="h-6 w-6 text-status-danger" aria-hidden />
      </div>
      <div className="space-y-1 max-w-xs">
        <p className="text-sm font-medium text-foreground">Failed to load</p>
        <p className="text-xs text-muted-foreground">{humanizeError(error)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export { humanizeError };
