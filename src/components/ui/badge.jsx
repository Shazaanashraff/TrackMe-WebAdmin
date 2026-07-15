import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        secondary: 'border-transparent bg-surface-muted text-muted-foreground',
        outline: 'border-border text-foreground',
        // domain status variants (label + colour, never colour alone) — see StatusBadge
        pending: 'border-transparent bg-status-pending/10 text-status-pending',
        progress: 'border-transparent bg-status-progress/10 text-status-progress',
        settled: 'border-transparent bg-status-settled/10 text-status-settled',
        warning: 'border-transparent bg-status-warning/10 text-status-warning',
        danger: 'border-transparent bg-status-danger/10 text-status-danger',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
