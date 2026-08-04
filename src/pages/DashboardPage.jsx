import { BarChart3, BookMarked, Bus as VehicleIcon, Star, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { AsyncSection } from '@/components/shared/async-section';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSuperAdminDashboard } from '@/hooks/use-dashboard';
import { useOperationsOverview, usePendingVehicleRequests } from '@/hooks/use-operations';

function SnapshotRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium tabular-nums', highlight && 'text-status-warning')}>
        {value}
      </span>
    </div>
  );
}

export function DashboardPage() {
  const dashQ = useSuperAdminDashboard();
  const opsQ = useOperationsOverview();
  const pendingQ = usePendingVehicleRequests({ status: 'PENDING' });

  const m = dashQ.data?.data;
  const totalManagers = m?.managers?.totalManagers ?? 0;
  const activeVehicles = m?.vehicles?.activeVehicles ?? 0;
  const confirmedBookings = m?.bookings?.confirmedBookings ?? 0;
  const avgRating = m?.reviews?.averageRating;
  const inactiveVehicles = m?.vehicles?.inactiveVehicles ?? 0;
  const pendingCount = (pendingQ.data?.data || []).length;
  const operations = (opsQ.data?.data || []).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Fleet operations overview — managers, vehicles, bookings and performance."
      />

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Managers"
          value={totalManagers}
          icon={Users}
          isLoading={dashQ.isLoading}
        />
        <StatCard
          label="Active Vehicles"
          value={activeVehicles}
          icon={VehicleIcon}
          isLoading={dashQ.isLoading}
        />
        <StatCard
          label="Confirmed Bookings"
          value={confirmedBookings}
          icon={BookMarked}
          isLoading={dashQ.isLoading}
        />
        <StatCard
          label="Avg Rating"
          value={avgRating != null ? avgRating.toFixed(1) : '—'}
          icon={Star}
          isLoading={dashQ.isLoading}
        />
      </div>

      {dashQ.isError && (
        <ErrorState error={dashQ.error} onRetry={dashQ.refetch} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active routes overview — takes 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Active Routes</CardTitle>
            <CardDescription>
              {opsQ.isLoading
                ? 'Loading…'
                : `${operations.length} route${operations.length !== 1 ? 's' : ''} in operations`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <AsyncSection
              isLoading={opsQ.isLoading}
              error={opsQ.error}
              data={operations}
              onRetry={opsQ.refetch}
              emptyTitle="No active routes"
              emptyDescription="Operations appear here once managers have active routes."
              loadingFallback={<TableSkeleton cols={3} rows={4} />}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2 pr-4">
                        Route / Manager
                      </th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2 pr-4">
                        Status
                      </th>
                      <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-2">
                        Fleet
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.map((op, i) => (
                      <tr
                        key={op._id || i}
                        className="border-b border-border/50 last:border-0 hover:bg-surface-muted/50 transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <p className="font-medium text-foreground truncate max-w-[200px]">
                            {op.routeName || op.name || '—'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {op.managerName || op.manager || 'System managed'}
                          </p>
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={op.isActive !== false ? 'online' : 'offline'} />
                        </td>
                        <td className="py-3 text-right font-mono text-muted-foreground text-xs">
                          {op.activeVehicles ?? op.vehicles ?? '—'} vehicles
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AsyncSection>
          </CardContent>
        </Card>

        {/* Fleet snapshot — 1/3 width */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fleet Snapshot</CardTitle>
            <CardDescription>Current activity at a glance</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <AsyncSection
              isLoading={dashQ.isLoading}
              data={m}
              emptyTitle="No metrics"
            >
              <div className="space-y-3">
                <SnapshotRow
                  label="Pending vehicle requests"
                  value={pendingQ.isLoading ? '…' : pendingCount}
                  highlight={pendingCount > 0}
                />
                <SnapshotRow
                  label="Inactive vehicles"
                  value={inactiveVehicles}
                  highlight={inactiveVehicles > 0}
                />
                <SnapshotRow
                  label="Confirmed bookings"
                  value={confirmedBookings}
                />
                <SnapshotRow
                  label="Average fleet rating"
                  value={avgRating != null ? `${avgRating.toFixed(1)} / 5` : 'No ratings yet'}
                />
              </div>
            </AsyncSection>
          </CardContent>
        </Card>
      </div>

      {/* Analytics placeholder — time-series data not available from current API */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Analytics
          </CardTitle>
          <CardDescription>Detailed time-series charts</CardDescription>
        </CardHeader>
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
            <BarChart3 className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium text-foreground">Not enough data yet</p>
            <p className="text-xs max-w-xs">
              Time-series analytics require historical data series from the backend. These charts
              will populate automatically once the endpoint is available.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
