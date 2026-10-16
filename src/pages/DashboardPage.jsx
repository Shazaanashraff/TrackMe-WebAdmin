import { Link } from 'react-router-dom';
import { Bus as VehicleIcon, ChevronRight, ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { AsyncSection } from '@/components/shared/async-section';
import { CardSkeleton } from '@/components/shared/card-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { FleetByManagerChart } from '@/components/shared/fleet-by-manager-chart';
import { RelativeTime } from '@/components/shared/relative-time';
import { SummaryCard } from '@/components/shared/summary-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSuperAdminDashboard } from '@/hooks/use-dashboard';
import { useOperationsOverview, usePendingVehicleRequests } from '@/hooks/use-operations';

// The chart shows the biggest fleets first and stops at ten rows, so it stays
// readable once there are many managers. The Managers page has the full list.
const CHART_ROWS = 10;

// No bookings or ratings here, deliberately. Nothing in the product creates a
// booking or a review, so both read zero forever on live data (the backend
// sends 0, not null, for a missing average). The manager overview dropped them
// for the same reason.

const REQUEST_LABEL = {
  CREATE_VEHICLE_ACCOUNT: 'New vehicle',
  DELETE_VEHICLE: 'Remove vehicle',
};

function requestVehicleName(request) {
  const payload = request.payload;
  return payload?.vehicle?.vehicleName || payload?.vehicleSnapshot?.vehicleName || request.vehicleId;
}

function PendingRequests({ requestsQ }) {
  const requests = (requestsQ.data?.data || []).slice(0, 5);

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle className="text-base">Waiting for approval</CardTitle>
        <CardDescription>Vehicle requests from managers.</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {requestsQ.isLoading ? (
          <CardSkeleton lines={3} />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nothing waiting"
            description="New requests show up here."
          />
        ) : (
          <ul className="space-y-2">
            {requests.map((request) => (
              <li key={request._id}>
                <Link
                  to="/operations"
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {REQUEST_LABEL[request.type] || 'Request'}: {requestVehicleName(request)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {request.managerId?.name || 'A manager'}
                      {request.createdAt ? <> · <RelativeTime date={request.createdAt} /></> : null}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const dashQ = useSuperAdminDashboard();
  const opsQ = useOperationsOverview();
  const pendingQ = usePendingVehicleRequests({ status: 'PENDING' });

  const m = dashQ.data?.data;
  const pendingCount = (pendingQ.data?.data || []).length;

  const chartRows = (opsQ.data?.data || [])
    .map((op) => ({
      name: op.managerName || 'Unnamed',
      active: op.fleet?.activeVehicles ?? 0,
      inactive: op.fleet?.inactiveVehicles ?? 0,
    }))
    .filter((row) => row.active + row.inactive > 0)
    .sort((a, b) => (b.active + b.inactive) - (a.active + a.inactive))
    .slice(0, CHART_ROWS);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" className="mb-0" />

      {/* AsyncSection keeps the last-known numbers on screen when a refetch
          fails or the connection drops, and says why. */}
      <AsyncSection
        isLoading={dashQ.isLoading}
        error={dashQ.error}
        data={m}
        onRetry={dashQ.refetch}
        emptyTitle="No fleet data yet"
        loadingFallback={<CardSkeleton />}
      >
        <SummaryCard
          title="Fleet"
          icon={VehicleIcon}
          figures={[
            { label: 'Managers', value: m?.managers?.totalManagers ?? 0, href: '/managers' },
            { label: 'Active vehicles', value: m?.vehicles?.activeVehicles ?? 0 },
            {
              label: 'Inactive',
              value: m?.vehicles?.inactiveVehicles ?? 0,
              hidden: !m?.vehicles?.inactiveVehicles,
            },
            {
              label: 'Pending requests',
              value: pendingCount,
              href: '/operations',
              hidden: pendingCount === 0,
            },
          ]}
        />
      </AsyncSection>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Vehicles by manager</CardTitle>
            <CardDescription>Active and inactive vehicles for the largest fleets.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <AsyncSection
              isLoading={opsQ.isLoading}
              error={opsQ.error}
              data={chartRows}
              onRetry={opsQ.refetch}
              emptyTitle="No vehicles yet"
              emptyDescription="Fleets appear here once managers add vehicles."
              loadingFallback={<CardSkeleton lines={5} />}
            >
              <FleetByManagerChart rows={chartRows} />
            </AsyncSection>
          </CardContent>
        </Card>

        <PendingRequests requestsQ={pendingQ} />
      </div>
    </div>
  );
}
