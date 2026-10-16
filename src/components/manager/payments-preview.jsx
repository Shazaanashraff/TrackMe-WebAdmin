import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatLKR } from '@/components/shared/money';

// Placeholder figures for the Payments module, which has no backend yet. They
// only shape the preview, so the card says "Sample data" and is never fed from
// the API. Replace this array with the real monthly series when it exists.
const SAMPLE_MONTHS = [
  { label: 'May', received: 412000, expenses: 268000 },
  { label: 'Jun', received: 436000, expenses: 281000 },
  { label: 'Jul', received: 398000, expenses: 302000 },
  { label: 'Aug', received: 455000, expenses: 274000 },
  { label: 'Sep', received: 471000, expenses: 295000 },
  { label: 'Oct', received: 489000, expenses: 288000 },
];

const SAMPLE_EXPENSES = [
  { label: 'Fuel', amount: 148000 },
  { label: 'Maintenance', amount: 74000 },
  { label: 'Driver wages', amount: 52000 },
  { label: 'Insurance', amount: 14000 },
];

const MASK = '••••••';
const CHART_HEIGHT = 160;

function Amount({ value, revealed }) {
  return (
    <span className="font-mono tabular-nums">
      {revealed ? formatLKR(value) : MASK}
    </span>
  );
}

function Summary({ label, value, revealed }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">
        <Amount value={value} revealed={revealed} />
      </p>
    </div>
  );
}

export function PaymentsPreview() {
  const [revealed, setRevealed] = useState(false);

  const latest = SAMPLE_MONTHS[SAMPLE_MONTHS.length - 1];
  const peak = Math.max(...SAMPLE_MONTHS.flatMap((m) => [m.received, m.expenses]));
  const expenseTotal = SAMPLE_EXPENSES.reduce((sum, e) => sum + e.amount, 0);
  const topExpense = Math.max(...SAMPLE_EXPENSES.map((e) => e.amount));

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <CardTitle>Payments</CardTitle>
            <Badge variant="secondary">Coming soon</Badge>
          </div>
          <CardDescription>Earnings, expenses and monthly totals. Sample data.</CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setRevealed((v) => !v)}
          aria-pressed={revealed}
          aria-label={revealed ? 'Hide amounts' : 'Show amounts'}
          title={revealed ? 'Hide amounts' : 'Show amounts'}
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Summary label="Received this month" value={latest.received} revealed={revealed} />
          <Summary label="Expenses this month" value={latest.expenses} revealed={revealed} />
          <Summary label="Net this month" value={latest.received - latest.expenses} revealed={revealed} />
        </div>

        <section aria-label="Monthly received and expenses">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-medium text-foreground">Monthly received vs expenses</h4>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" aria-hidden />
                Received
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-status-warning" aria-hidden />
                Expenses
              </span>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2 sm:gap-4" style={{ height: CHART_HEIGHT + 24 }}>
            {SAMPLE_MONTHS.map((m) => (
              <div key={m.label} className="flex min-w-0 flex-col items-center justify-end gap-2">
                <div
                  className="flex w-full items-end justify-center gap-1 border-b border-border"
                  style={{ height: CHART_HEIGHT }}
                  title={revealed ? `${m.label}: received ${formatLKR(m.received)}, expenses ${formatLKR(m.expenses)}` : undefined}
                >
                  <div
                    className="w-full max-w-5 rounded-t bg-primary"
                    style={{ height: `${(m.received / peak) * 100}%` }}
                  />
                  <div
                    className="w-full max-w-5 rounded-t bg-status-warning"
                    style={{ height: `${(m.expenses / peak) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Expense breakdown">
          <h4 className="mb-3 text-sm font-medium text-foreground">Where the money goes</h4>
          <ul className="space-y-3">
            {SAMPLE_EXPENSES.map((e) => (
              <li key={e.label} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-foreground">{e.label}</span>
                  <span className="text-muted-foreground">
                    <Amount value={e.amount} revealed={revealed} />
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-status-warning"
                    style={{ width: `${(e.amount / topExpense) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Total expenses <Amount value={expenseTotal} revealed={revealed} />
          </p>
        </section>
      </CardContent>
    </Card>
  );
}
