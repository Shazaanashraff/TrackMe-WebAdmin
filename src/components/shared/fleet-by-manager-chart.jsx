import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { prefersReducedMotion, useChartReady } from '@/hooks/use-chart-ready';

const CONFIG = {
  active: { label: 'Active', color: 'var(--primary)' },
  inactive: { label: 'Inactive', color: 'var(--muted-foreground)' },
};

const ROW_HEIGHT = 40;

/**
 * Active and inactive vehicles per manager, stacked into one bar each. Sits
 * behind a skeleton for a moment and then mounts, so the bars grow in; reduced
 * motion shows it straight away with no animation.
 */
export function FleetByManagerChart({ rows }) {
  const ready = useChartReady(500);
  const animate = !prefersReducedMotion();
  const height = Math.max(rows.length, 3) * ROW_HEIGHT + 40;

  if (!ready) return <Skeleton className="w-full" style={{ height }} aria-hidden />;

  return (
    <ChartContainer config={CONFIG} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={112} />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="active" stackId="fleet" fill="var(--color-active)" barSize={16}
          isAnimationActive={animate} animationDuration={900} animationBegin={0} animationEasing="ease-out"
        />
        <Bar
          dataKey="inactive" stackId="fleet" fill="var(--color-inactive)" barSize={16} radius={[0, 4, 4, 0]}
          isAnimationActive={animate} animationDuration={700} animationBegin={600} animationEasing="ease-out"
        />
      </BarChart>
    </ChartContainer>
  );
}
