import { cn } from '@/lib/utils';

// A labelled overview of a multi-section form. Every section stays visible and
// editable below it — this is a map of the form, not a wizard that gates steps,
// so a manager filling things out of order is never blocked.
export function StepRail({ steps, className }) {
  return (
    <ol
      aria-label="Form sections"
      className={cn('grid gap-3 sm:grid-cols-3', className)}
    >
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-muted px-3 py-2.5"
        >
          <span
            aria-hidden
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
          >
            {index + 1}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">{step.title}</span>
            <span className="block text-xs text-muted-foreground">{step.description}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
