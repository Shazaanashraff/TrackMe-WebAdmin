import { useMemo } from 'react';
import { Bus, BookOpen, Hourglass, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { AsyncSection } from '@/components/shared/async-section';
import { Money } from '@/components/shared/money';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useManagerDashboard } from '@/hooks/use-dashboard';

export function ManagerDashboardPage() {
  const dashQ = useManagerDashboard();
  const d = dashQ.data?.data;

  const fleet = d?.fleet || {};
  const bookings = d?.bookings || {};
  const pending = d?.pendingRequests ?? 0;

  const utilizationPct = useMemo(() => {
    if (!fleet.totalBuses) return null;
    return Math.round((fleet.activeBuses / fleet.totalBuses) * 100);
  }, [fleet.activeBuses, fleet.totalBuses]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manager Dashboard"
        description="Live overview of your fleet, bookings, and pending requests."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Buses"
          value={fleet.totalBuses ?? '—'}
          icon={Bus}
          isLoading={dashQ.isLoading}
        />
        <StatCard
          label="Active Buses"
          value={
            utilizationPct != null
              ? `${fleet.activeBuses} (${utilizationPct}%)`
              : (fleet.activeBuses ?? '—')
          }
          icon={Bus}
          isLoading={dashQ.isLoading}
        />
        <StatCard
          label="Pending Requests"
          value={pending}
          icon={Hourglass}
          isLoading={dashQ.isLoading}
        />
        <StatCard
          label="Total Revenue"
          value={dashQ.isLoading ? undefined : <Money amount={bookings.totalRevenue} />}
          icon={Wallet}
          isLoading={dashQ.isLoading}
        />
      </div>

      {/* Booking summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking Summary</CardTitle>
          <CardDescription>Confirmed and cancelled journeys across all your buses</CardDescription>
        </CardHeader>
        <CardContent>
          <AsyncSection
            isLoading={dashQ.isLoading}
            error={dashQ.error}
            data={d}
            onRetry={dashQ.refetch}
            emptyTitle="No booking data yet"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Confirmed Bookings', value: bookings.confirmedBookings ?? 0, icon: BookOpen },
                { label: 'Cancelled Bookings', value: bookings.cancelledBookings ?? 0, icon: BookOpen },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-border bg-surface-muted px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
                  <p className="text-2xl font-bold font-heading mt-1 tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </AsyncSection>
        </CardContent>
      </Card>

      {/* Analytics placeholder — no time-series data available yet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking Trend</CardTitle>
          <CardDescription>Monthly performance overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Not enough data yet
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
