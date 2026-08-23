import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Replaces one section, never the whole page. Deliberately calm — amber, not
 * red — because being offline isn't a bug and shouldn't look like one.
 */
export function OfflineCard({
  onRetry,
  description = "You're offline. This section will fill in when you're back.",
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="h-12 w-12 rounded-xl bg-status-warning/10 flex items-center justify-center">
        <WifiOff className="h-6 w-6 text-status-warning" aria-hidden />
      </div>
      <div className="space-y-1 max-w-xs">
        <p className="text-sm font-medium text-foreground">Can&apos;t load this right now</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
