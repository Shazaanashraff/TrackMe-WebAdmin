import { cn } from '@/lib/utils';

// The brand tile: a "P" for Pingo, in the page's own primary colour.
export function LogoMark({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-heading text-sm font-bold text-primary-foreground',
        className,
      )}
    >
      P
    </span>
  );
}
