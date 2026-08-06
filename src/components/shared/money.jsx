import { cn } from '@/lib/utils';

export function formatLKR(amount) {
  if (amount == null || isNaN(Number(amount))) return 'None';
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

export function Money({ amount, className }) {
  return (
    <span className={cn('font-mono tabular-nums text-right', className)}>
      {formatLKR(amount)}
    </span>
  );
}
