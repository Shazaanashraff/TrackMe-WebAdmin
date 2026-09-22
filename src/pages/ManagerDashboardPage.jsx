import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bus as VehicleIcon, Hourglass } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { AsyncSection } from '@/components/shared/async-section';
import { CardSkeleton } from '@/components/shared/card-skeleton';
import { useManagerDashboard } from '@/hooks/use-dashboard';
import { useOnlineStatus } from '@/hooks/use-online-status';

const STAT_GRID = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4';

// No booking metrics here, deliberately. The backend still aggregates revenue
// and confirmed/cancelled counts, but nothing can feed them: the passenger
// app's booking screens are not mounted in its navigation, so no booking is
// ever created outside the sandbox seed. They read zero forever on live data,
// and they contradict the shuttle model, where riders enrol with a driver by
// key rather than booking a seat. See docs/CHANGES.md 2026-09-23.
export function ManagerDashboardPage() {
  const { user } = useOutletContext() ?? {};
  const isOnline = useOnlineStatus();
  const dashQ = useManagerDashboard();
  const d = dashQ.data?.data;
  const dashStale = !isOnline && Boolean(d);

  const fleet = d?.fleet || {};
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
        description="Live overview of your fleet and pending requests."
      />

      {/* The stat grid is wrapped rather than each card handling its own states.
          AsyncSection is what tells a dropped connection apart from a real
          failure, keeps the last-known numbers on screen when a background
          refetch fails, and offers the retry. Three cards each announcing
          "Failed to load" would say the same thing three times and lose the
          offline wording. */}
      <AsyncSection
        isLoading={dashQ.isLoading}
        error={dashQ.error}
        data={d}
        onRetry={dashQ.refetch}
        emptyTitle="No fleet data yet"
        emptyDescription="Add your first vehicle and this fills in."
        loadingFallback={(
          <div className={STAT_GRID}>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}
      >
        <div className={STAT_GRID}>
          <StatCard
            label="Total Vehicles"
            value={fleet.totalVehicles ?? 'None'}
            icon={VehicleIcon}
            stale={dashStale}
            asOf={dashQ.dataUpdatedAt}
          />
          <StatCard
            label="Active Vehicles"
            // The count is the stat; the utilization percentage is the caption.
            // Concatenating them made one unreadable value at phone widths.
            value={fleet.activeVehicles ?? 'None'}
            hint={utilizationPct != null ? `${utilizationPct}% of fleet active` : undefined}
            icon={VehicleIcon}
            stale={dashStale}
            asOf={dashQ.dataUpdatedAt}
          />
          <StatCard
            label="Pending Requests"
            value={pending}
            icon={Hourglass}
            stale={dashStale}
            asOf={dashQ.dataUpdatedAt}
          />
        </div>
      </AsyncSection>
    </div>
  );
}
