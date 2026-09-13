import { cn } from '@/lib/utils';
import { getRelative, getAbsolute } from './relative-time';

const DEFAULT_WARN_AFTER_MS = 10 * 60 * 1000;

/**
 * A small caption saying how old the data on screen is. Pass a TanStack query's
 * `dataUpdatedAt`.
 *
 * Visibility rule (so normal, fresh, online pages look exactly as they do now):
 * it renders only when the data is actually worth flagging — the tab is
 * `offline`, the copy is older than `warnAfterMs`, or `loud` is set. Otherwise
 * it returns null.
 *
 * Styling: plain grey and calm by default; amber once it's past the threshold
 * or `loud`. `loud` is for surfaces where acting on a stale copy actively
 * misleads (the enrollment-request queue — approving a row another manager
 * already handled). Offline is not an error, so this never goes red.
 *
 * Static, like `RelativeTime` — it reflects `updatedAt` at render time and does
 * not tick on its own. The full timestamp sits in a native `title` tooltip
 * (no Radix provider dependency — this renders in bare card headers).
 */
export function StaleChip({
  updatedAt,
  offline = false,
  warnAfterMs = DEFAULT_WARN_AFTER_MS,
  loud = false,
  label = 'Updated',
  className,
}) {
  if (!updatedAt) return null;

  const ageMs = Date.now() - new Date(updatedAt).getTime();
  const past = ageMs > warnAfterMs;

  if (!offline && !loud && !past) return null;

  const warn = loud || offline || past;

  return (
    <span
      title={`Last updated ${getAbsolute(updatedAt)}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium cursor-default',
        warn
          ? 'border-status-warning/30 bg-status-warning/10 text-status-warning'
          : 'border-border bg-surface-muted text-muted-foreground',
        className,
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full bg-current', loud && 'animate-pulse')}
        aria-hidden
      />
      {label} {getRelative(updatedAt)}
    </span>
  );
}
