import { cn } from '@/lib/utils';

const STATE_CONFIG = {
  live: { dot: 'bg-status-settled', label: 'Live', pulse: true },
  stale: { dot: 'bg-status-warning', label: 'Stale', pulse: false },
  offline: { dot: 'bg-status-danger', label: 'Offline', pulse: false },
};

export function LiveIndicator({ state = 'offline' }) {
  const config = STATE_CONFIG[state] ?? STATE_CONFIG.offline;
  return (
    <div className="flex items-center gap-1.5" role="status" aria-label={config.label}>
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-settled opacity-75 motion-reduce:hidden"
            aria-hidden
          />
        )}
        <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dot)} />
      </span>
      <span className="text-xs text-muted-foreground">{config.label}</span>
    </div>
  );
}
