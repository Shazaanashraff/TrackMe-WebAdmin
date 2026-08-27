import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bus as VehicleIcon, BookOpen, Hourglass, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { AsyncSection } from '@/components/shared/async-section';
import { Money } from '@/components/shared/money';
import { StaleChip } from '@/components/shared/stale-chip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useManagerDashboard } from '@/hooks/use-dashboard';
import { useOnlineStatus } from '@/hooks/use-online-status';

export function ManagerDashboardPage() {
  const { user } = useOutletContext() ?? {};
  const isOnline = useOnlineStatus();
  const dashQ = useManagerDashboard();
  const d = dashQ.data?.data;
  const dashStale = !isOnline && Boolean(d);

  const fleet = d?.fleet || {};
  const bookings = d?.bookings || {};
  const pending = d?.pendingRequests ?? 0;

  const utilizationPct = useMemo(() => {
    if (!fleet.totalVehicles) return null;
    // A stale/inconsistent backend aggregate (activeVehicles > totalVehicles)
    // shouldn't render as a percentage over 100.
    return Math.min(100, Math.round((fleet.activeVehicles / fleet.totalVehicles) * 100));
  }, [fleet.activeVehicles, fleet.totalVehicles]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={user?.name || user?.email || 'Manager Dashboard'}
        description="Live overview of your fleet, bookings, and pending requests."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Vehicles"
          value={fleet.totalVehicles ?? 'None'}
          icon={VehicleIcon}
          isLoading={dashQ.isLoading}
          stale={dashStale}
          asOf={dashQ.dataUpdatedAt}
        />
        <StatCard
          label="Active Vehicles"
          value={
            utilizationPct != null
              ? `${fleet.activeVehicles} (${utilizationPct}%)`
              : (fleet.activeVehicles ?? 'None')
          }
          icon={VehicleIcon}
          isLoading={dashQ.isLoading}
          stale={dashStale}
          asOf={dashQ.dataUpdatedAt}
        />
        <StatCard
          label="Pending Requests"
          value={pending}
          icon={Hourglass}
          isLoading={dashQ.isLoading}
          stale={dashStale}
          asOf={dashQ.dataUpdatedAt}
        />
        <StatCard
          label="Total Revenue"
          value={dashQ.isLoading ? undefined : <Money amount={bookings.totalRevenue} />}
          icon={Wallet}
          isLoading={dashQ.isLoading}
          stale={dashStale}
          asOf={dashQ.dataUpdatedAt}
        />
      </div>

      {/* Booking summary */}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Booking Summary</CardTitle>
            <CardDescription>Confirmed and cancelled journeys across all your vehicles</CardDescription>
          </div>
          <StaleChip updatedAt={dashQ.dataUpdatedAt} offline={!isOnline} />
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

      {/* Analytics placeholder: no time-series data available yet. Kept compact
          (issue #15): a full-height empty card for a feature that doesn't exist yet
          dominated the dashboard's visible space. */}
      <Card>
        <CardContent className="py-3 flex items-center gap-2.5">
          <span className="text-sm font-medium text-foreground">Booking Trend</span>
          <span className="text-xs text-muted-foreground">Not enough data yet</span>
        </CardContent>
      </Card>
    </div>
  );
}
