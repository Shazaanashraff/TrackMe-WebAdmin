import { cn } from '@/lib/utils';

/**
 * A small crosshair, the kind a drawing puts where two lines meet. The page's grids (the three
 * points, the choice between rider and driver) use them at their corners and joints, so they read
 * as something measured and drawn rather than boxes stacked up. Centred on the point it is given.
 * Decorative.
 */
export function Cross({ className, style }) {
  return (
    <span
      aria-hidden="true"
      data-cross
      className={cn('pointer-events-none absolute z-10 block h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-l-ink/50', className)}
      style={style}
    >
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current" />
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
    </span>
  );
}
