import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

function Figure({ label, value, href }) {
  const body = (
    <>
      <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </>
  );
  if (!href) return <div>{body}</div>;
  return (
    <Link
      to={href}
      className="rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {body}
    </Link>
  );
}

/**
 * One card that carries a handful of headline numbers side by side. A figure
 * with `hidden` set is not rendered at all (used for counts that only matter
 * when above zero); one with `href` becomes a link to where the number lives.
 */
export function SummaryCard({ title, icon: Icon, figures }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-x-10 gap-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted">
              <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
            </div>
          )}
          <h2 className="font-heading text-base font-semibold">{title}</h2>
        </div>
        {figures.filter((figure) => !figure.hidden).map((figure) => (
          <Figure key={figure.label} {...figure} />
        ))}
      </CardContent>
    </Card>
  );
}
