import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function humanizeError(error) {
  if (!error) return 'An unexpected error occurred.';
  if (typeof error === 'string') return error;
  const msg = String(error.message || '');
  const status = error.status;

  if (status === 401 || /401|unauthorized/i.test(msg)) return 'Session expired. Please log in again.';
  if (status === 403 || /403|forbidden/i.test(msg)) return "You don't have permission to view this.";
  if (status === 404 || /404|not found/i.test(msg)) return 'The requested resource was not found.';
  if (status >= 500 || /5\d{2}|server error/i.test(msg)) return 'Server error. Please try again in a moment.';
  // No response ever came back — offline, a timeout, DNS/CORS failure — so the
  // request never reached the server. Unlike a genuine rejection above, "just
  // retry" is good advice here. api.js's request() only ever sets error.status
  // for a response that DID come back, so its absence is the signal — more
  // reliable than sniffing the message text, which varies by browser/failure
  // mode ("Failed to fetch", Safari's "Load failed", an AbortError from a
  // timeout, none of which reliably contain the word "network") (issue #76).
  if (status == null && msg) return 'Network error. Check your connection and try again.';
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
