import { cn } from '@/lib/utils';

export function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
      <div className="space-y-1 min-w-0">
        <h1 className="text-2xl font-bold font-heading text-foreground leading-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
