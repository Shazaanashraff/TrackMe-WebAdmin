import { useOutletContext, Link } from 'react-router-dom';
import { Bus as VehicleIcon, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { AsyncSection } from '@/components/shared/async-section';
import { CardSkeleton } from '@/components/shared/card-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LiveIndicator } from '@/components/shared/live-indicator';
import { PaymentsPreview } from '@/components/manager/payments-preview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useManagerDashboard } from '@/hooks/use-dashboard';
import { trackingState, useManagerFleetLive } from '@/hooks/use-tracking';

// No booking metrics here, deliberately. The backend still aggregates revenue
// and confirmed/cancelled counts, but nothing can feed them: the passenger
// app's booking screens are not mounted in its navigation, so no booking is
// ever created outside the sandbox seed. They read zero forever on live data,
// and they contradict the shuttle model, where riders enrol with a driver by
// key rather than booking a seat. See docs/CHANGES.md 2026-09-23.
function Figure({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function VehicleSummary({ fleet, pending }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-x-10 gap-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted">
            <VehicleIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
          </div>
          <h2 className="font-heading text-base font-semibold">Vehicles</h2>
        </div>
        <Figure label="Total" value={fleet.totalVehicles ?? 0} />
        <Figure label="Active" value={fleet.activeVehicles ?? 0} />
        {pending > 0 && <Figure label="Pending" value={pending} />}
      </CardContent>
    </Card>
  );
}

function RunningVehicles() {
  const fleetQ = useManagerFleetLive();
  const running = (fleetQ.data?.data || []).filter((record) => trackingState(record) !== 'offline');

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>On a journey</CardTitle>
        <CardDescription>Select a vehicle to follow it on the map.</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {fleetQ.isLoading ? (
          <CardSkeleton lines={3} />
        ) : fleetQ.error ? (
          <ErrorState error={fleetQ.error} onRetry={fleetQ.refetch} />
        ) : running.length === 0 ? (
          <EmptyState
            icon={VehicleIcon}
            title="No vehicle is running"
            description="Vehicles appear here once their driver starts a journey."
          />
        ) : (
          <ul className="space-y-2">
            {running.map((record) => (
              <li key={record.vehicleId}>
                <Link
                  to={`/manager/tracking?vehicle=${encodeURIComponent(record.vehicleId)}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {record.vehicle?.vehicleName || record.vehicleId}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {record.driver?.name || 'No driver assigned'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <LiveIndicator state={trackingState(record)} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ManagerDashboardPage() {
  const { user } = useOutletContext() ?? {};
  const dashQ = useManagerDashboard();
  const d = dashQ.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={user?.name || user?.email || 'Manager Dashboard'}
        className="mb-0"
      />

      {/* AsyncSection tells a dropped connection apart from a real failure and
          keeps the last-known numbers on screen when a background refetch
          fails, so the summary needs no per-figure error handling. */}
      <AsyncSection
        isLoading={dashQ.isLoading}
        error={dashQ.error}
        data={d}
        onRetry={dashQ.refetch}
        emptyTitle="No fleet data yet"
        emptyDescription="Add your first vehicle and this fills in."
        loadingFallback={<CardSkeleton />}
      >
        <VehicleSummary fleet={d?.fleet || {}} pending={d?.pendingRequests ?? 0} />
      </AsyncSection>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PaymentsPreview />
        </div>
        <RunningVehicles />
      </div>
    </div>
  );
}
