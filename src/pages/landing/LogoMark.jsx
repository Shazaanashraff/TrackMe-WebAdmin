import { cn } from '@/lib/utils';

// The same petrol "T" tile the portal sidebar uses, so the brand reads as one.
export function LogoMark({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-heading text-sm font-bold text-primary-foreground',
        className,
      )}
    >
      T
    </span>
  );
}
