import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { formatLKR } from '@/components/shared/money';
import { prefersReducedMotion, useChartReady } from '@/hooks/use-chart-ready';

// Placeholder figures for the Payments module, which has no backend yet. They
// only shape the preview, so the card says "Sample data" and is never fed from
// the API. Replace these arrays with the real series when it exists.
const SAMPLE_MONTHS = [
  { month: 'May', received: 412000, expenses: 268000 },
  { month: 'Jun', received: 436000, expenses: 281000 },
  { month: 'Jul', received: 398000, expenses: 302000 },
  { month: 'Aug', received: 455000, expenses: 274000 },
  { month: 'Sep', received: 471000, expenses: 295000 },
  { month: 'Oct', received: 489000, expenses: 288000 },
];

const SAMPLE_EXPENSES = [
  { category: 'Fuel', amount: 148000 },
  { category: 'Maintenance', amount: 74000 },
  { category: 'Driver wages', amount: 52000 },
  { category: 'Insurance', amount: 14000 },
];

const MONTHLY_CONFIG = {
  received: { label: 'Received', color: 'var(--primary)' },
  expenses: { label: 'Expenses', color: 'var(--status-warning)' },
};
const EXPENSE_CONFIG = { amount: { label: 'Expenses', color: 'var(--status-warning)' } };

const MASK = '••••••';

function Summary({ label, value, revealed }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
        {revealed ? formatLKR(value) : MASK}
      </p>
    </div>
  );
}

function ChartSkeleton({ className }) {
  return <Skeleton className={className} aria-hidden />;
}

export function PaymentsPreview() {
  const [revealed, setRevealed] = useState(false);
  const ready = useChartReady(600);
  const animate = !prefersReducedMotion();

  const latest = SAMPLE_MONTHS[SAMPLE_MONTHS.length - 1];
  const expenseTotal = SAMPLE_EXPENSES.reduce((sum, e) => sum + e.amount, 0);

  // Tooltips and bar labels carry the amounts, so both honour the eye toggle.
  const money = (value) => (revealed ? formatLKR(value) : MASK);

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
          <h4 className="mb-2 text-sm font-medium text-foreground">Monthly received vs expenses</h4>
          {ready ? (
            <ChartContainer config={MONTHLY_CONFIG} className="aspect-auto h-52 w-full">
              <BarChart data={SAMPLE_MONTHS} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barGap={4}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span
                          className="h-2.5 w-2.5 rounded-[2px]"
                          style={{ backgroundColor: `var(--color-${name})` }}
                        />
                        {MONTHLY_CONFIG[name]?.label}
                      </span>
                      <span className="font-mono font-medium tabular-nums">{money(value)}</span>
                    </div>
                  )}
                  />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="received" fill="var(--color-received)" radius={[4, 4, 0, 0]}
                  isAnimationActive={animate} animationDuration={900} animationBegin={0} animationEasing="ease-out"
                />
                <Bar
                  dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]}
                  isAnimationActive={animate} animationDuration={900} animationBegin={180} animationEasing="ease-out"
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <ChartSkeleton className="h-52 w-full" />
          )}
        </section>

        <section aria-label="Expense breakdown">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h4 className="text-sm font-medium text-foreground">Where the money goes</h4>
            <p className="text-xs text-muted-foreground">
              Total expenses <span className="font-mono tabular-nums">{money(expenseTotal)}</span>
            </p>
          </div>
          {ready ? (
            <ChartContainer config={EXPENSE_CONFIG} className="aspect-auto h-44 w-full">
              <BarChart data={SAMPLE_EXPENSES} layout="vertical" margin={{ top: 0, right: 96, left: 8, bottom: 0 }}>
                <YAxis
                  dataKey="category" type="category" tickLine={false} axisLine={false} width={96}
                />
                <XAxis dataKey="amount" type="number" hide />
                <Bar
                  dataKey="amount" fill="var(--color-amount)" radius={4} barSize={14}
                  isAnimationActive={animate} animationDuration={1000} animationBegin={300} animationEasing="ease-out"
                >
                  <LabelList
                    dataKey="amount" position="right" offset={8}
                    className="fill-muted-foreground font-mono"
                    formatter={(value) => money(value)}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <ChartSkeleton className="h-44 w-full" />
          )}
        </section>
      </CardContent>
    </Card>
  );
}
