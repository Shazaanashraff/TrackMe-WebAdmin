import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, Bus as VehicleIcon, CheckCircle, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable } from '@/components/shared/data-table';
import { AsyncSection } from '@/components/shared/async-section';
import { StatusBadge } from '@/components/shared/status-badge';
import { RelativeTime } from '@/components/shared/relative-time';
import { Money } from '@/components/shared/money';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FormDialog } from '@/components/shared/form-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useOperationsOverview,
  useOperationManagerDetail,
  usePendingVehicleRequests,
  useAuditLogs,
  useReviewVehicleRequest,
  useUpdateVehicle,
} from '@/hooks/use-operations';
import { SERVICE_TYPES } from '@/lib/serviceTypes';

// The backend's getAuditLogs clamps `limit` to 200 server-side
// (superAdminController.js) and has no skip/cursor param yet — so "load more"
// here means re-requesting with a larger limit, not a true offset page. See
// docs/modules/OPERATIONS.md §5 for the tracked backend follow-up (issue #12).
const AUDIT_INITIAL_LIMIT = 60;
const AUDIT_LIMIT_STEP = 60;
const AUDIT_LIMIT_MAX = 200;

export function OperationsPage() {
  const [searchParams] = useSearchParams();
  const [selectedManagerId, setSelectedManagerId] = useState(searchParams.get('managerId') || '');
  const [reviewTarget, setReviewTarget] = useState(null); // { id, decision }
  const [editVehicle, setEditVehicle] = useState(null);
  const [editServiceType, setEditServiceType] = useState('PUBLIC');
  const [requestStatus, setRequestStatus] = useState('PENDING');
  const [auditManagerId, setAuditManagerId] = useState('');
  const [auditLimit, setAuditLimit] = useState(AUDIT_INITIAL_LIMIT);
  const [vehicleDialogError, setVehicleDialogError] = useState(null);

  // The Managers page's "View" action navigates here with ?managerId=X. Re-sync
  // the selection whenever that param changes so a second View click while this
  // page is already mounted actually switches the detail panel (issue #65) —
  // the initial useState read above only covers the first mount.
  useEffect(() => {
    const managerId = searchParams.get('managerId');
    if (managerId) setSelectedManagerId(managerId);
  }, [searchParams]);

  const overviewQ = useOperationsOverview();
  const detailQ = useOperationManagerDetail(selectedManagerId);
  const requestsQ = usePendingVehicleRequests({ status: requestStatus });
  const auditQ = useAuditLogs({ limit: auditLimit, managerId: auditManagerId });
  const reviewM = useReviewVehicleRequest();
  const updateVehicleM = useUpdateVehicle();

  const overview = overviewQ.data?.data || [];
  const requests = requestsQ.data?.data || [];
  const auditLogs = auditQ.data?.data || [];
  const detail = detailQ.data?.data;

  const stats = useMemo(() => ({
    total: overview.length,
    active: overview.filter((o) => o.isActive).length,
    pending: requests.filter((r) => r.status === 'PENDING').length,
    audit: auditLogs.length,
  }), [overview, requests, auditLogs]);

  const detailStats = useMemo(() => {
    const vehicles = detail?.vehicles || [];
    return {
      total: vehicles.length,
      active: vehicles.filter((b) => b.isActive).length,
      bookings: vehicles.reduce((s, b) => s + (b.bookingMetrics?.totalBookings || 0), 0),
      revenue: vehicles.reduce((s, b) => s + (b.bookingMetrics?.totalRevenue || 0), 0),
    };
  }, [detail]);

  const handleReview = async (reason) => {
    if (!reviewTarget) return;
    try {
      await reviewM.mutateAsync({
        requestId: reviewTarget.id,
        payload: { decision: reviewTarget.decision, note: reason || '' },
      });
      toast(`Request ${reviewTarget.decision === 'APPROVE' ? 'approved' : 'rejected'}`);
      setReviewTarget(null);
    } catch (err) {
      // Leave reviewTarget set so the dialog stays open and ConfirmDialog's
      // internal `reason` state (which it clears on close) survives — the
      // admin can retry without retyping a rejection reason.
      toast(`Failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleSaveVehicle = async () => {
    if (!editVehicle) return;
    setVehicleDialogError(null);
    try {
      await updateVehicleM.mutateAsync({ vehicleId: editVehicle.vehicleId || editVehicle._id, payload: { serviceType: editServiceType } });
      toast('Vehicle updated');
      setEditVehicle(null);
    } catch (err) {
      setVehicleDialogError(err);
    }
  };

  const overviewColumns = useMemo(() => [
    { id: 'manager', header: 'Manager', accessorKey: 'managerName', cell: (i) => <span className="font-medium">{i.getValue()}</span> },
    { id: 'vehicles', header: 'Vehicles', accessorFn: (row) => row.fleet?.totalVehicles ?? 0, cell: (i) => i.getValue() },
    { id: 'bookings', header: 'Bookings', accessorFn: (row) => row.bookings?.totalBookings ?? 0, cell: (i) => i.getValue() },
    // isActive is the manager account's active/suspended flag, not a live
    // connection signal — matches the label ManagersPage already uses for the
    // same field (issue #14).
    { id: 'status', header: 'Status', accessorKey: 'isActive', cell: (i) => <StatusBadge status={i.getValue() ? 'active' : 'suspended'} /> },
  ], []);

  const vehicleColumns = useMemo(() => [
    { id: 'name', header: 'Vehicle', accessorKey: 'vehicleName', cell: (i) => <span className="font-medium">{i.getValue()}</span> },
    { id: 'service', header: 'Service', accessorKey: 'serviceType', cell: (i) => <Badge variant="secondary">{i.getValue() || 'PUBLIC'}</Badge> },
    // isActive is the vehicle's deliberate-deactivation flag — the backend has
    // no separate live-connection signal here, so labeling it "Online"/"Offline"
    // implied a real-time state this data can't back up, and conflated a
    // deliberately deactivated vehicle with one that's simply disconnected
    // (issue #14). "Active"/"Deactivated" reads the field honestly.
    { id: 'state', header: 'State', accessorKey: 'isActive', cell: (i) => <StatusBadge status={i.getValue() ? 'active' : 'deactivated'} /> },
    { id: 'rating', header: 'Rating', accessorKey: 'reviewMetrics', cell: (i) => i.getValue()?.averageRating?.toFixed(1) ?? 'None' },
    { id: 'bookings', header: 'Bookings', accessorKey: 'bookingMetrics', cell: (i) => i.getValue()?.totalBookings ?? 0 },
    {
      id: 'actions', header: '', accessorKey: '_id', enableSorting: false,
      cell: (i) => (
        <Button size="sm" variant="ghost" onClick={() => { setEditVehicle(i.row.original); setEditServiceType(i.row.original.serviceType || 'PUBLIC'); setVehicleDialogError(null); }}>
          Edit
        </Button>
      ),
    },
  ], []);

  const requestColumns = useMemo(() => [
    { id: 'type', header: 'Type', accessorKey: 'type' },
    { id: 'manager', header: 'Manager', accessorKey: 'managerId', cell: (i) => i.getValue()?.name || 'None' },
    {
      id: 'vehicleId',
      header: 'Vehicle',
      accessorKey: 'vehicleId',
      cell: (i) => {
        const vehicleId = i.getValue();
        // CREATE_VEHICLE_ACCOUNT carries the proposed vehicle under `payload.vehicle`;
        // DELETE_VEHICLE carries the vehicle being removed under `payload.vehicleSnapshot`.
        const payload = i.row.original.payload;
        const vehicleName = payload?.vehicle?.vehicleName || payload?.vehicleSnapshot?.vehicleName;
        return vehicleName ? `${vehicleName} (${vehicleId})` : vehicleId;
      },
    },
    { id: 'submitted', header: 'Submitted', accessorKey: 'createdAt', cell: (i) => i.getValue() ? <RelativeTime date={i.getValue()} /> : 'None' },
    { id: 'reason', header: 'Reason', accessorKey: 'reason', cell: (i) => i.getValue() || 'None' },
    {
      id: 'actions', header: '', accessorKey: '_id', enableSorting: false,
      cell: (i) => {
        const busy = reviewM.isPending && reviewM.variables?.requestId === i.getValue();
        return (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => setReviewTarget({ id: i.getValue(), decision: 'APPROVE' })}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" disabled={busy}
              onClick={() => setReviewTarget({ id: i.getValue(), decision: 'REJECT' })}>
              Reject
            </Button>
          </div>
        );
      },
    },
  ], [reviewM.isPending, reviewM.variables]);

  const auditColumns = useMemo(() => [
    { id: 'time', header: 'Time', accessorKey: 'createdAt', cell: (i) => i.getValue() ? <RelativeTime date={i.getValue()} /> : 'None' },
    { id: 'manager', header: 'Manager', accessorKey: 'managerId', cell: (i) => i.getValue()?.name || 'None' },
    { id: 'action', header: 'Action', accessorKey: 'action' },
    { id: 'entity', header: 'Entity', accessorKey: 'entityType' },
    { id: 'actor', header: 'Actor', accessorKey: 'actorId', cell: (i) => i.getValue()?.email || 'None' },
  ], []);

  const managerFilterOptions = useMemo(() => overview.map((o) => ({ id: o.managerId, name: o.managerName })), [overview]);

  // A full page came back, so the server may hold more beyond what's fetched.
  // Switching the manager filter starts a fresh 60 rather than carrying over
  // whatever limit "Load older activity" had reached for a different filter.
  const canLoadMoreAudit = auditLogs.length === auditLimit && auditLimit < AUDIT_LIMIT_MAX;
  const atAuditLimitCap = auditLimit >= AUDIT_LIMIT_MAX && auditLogs.length === AUDIT_LIMIT_MAX;

  const handleAuditManagerChange = (v) => {
    setAuditManagerId(v === '_all' ? '' : v);
    setAuditLimit(AUDIT_INITIAL_LIMIT);
  };

  const handleLoadMoreAudit = () => {
    setAuditLimit((l) => Math.min(AUDIT_LIMIT_MAX, l + AUDIT_LIMIT_STEP));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations"
        description="Supervise manager performance, review requests, and track operation-level activity."
      />

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Managers" value={stats.total} icon={Activity} isLoading={overviewQ.isLoading} />
        <StatCard label="Active Managers" value={stats.active} icon={CheckCircle} isLoading={overviewQ.isLoading} />
        <StatCard label="Pending Requests" value={stats.pending} icon={ClipboardList} isLoading={requestsQ.isLoading} />
        <StatCard label="Audit Records" value={stats.audit} icon={VehicleIcon} isLoading={auditQ.isLoading} />
      </div>

      {/* Managers overview + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overview table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operations Managers</CardTitle>
            <CardDescription>Click a row to view manager detail</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <DataTable
              columns={overviewColumns}
              data={overview}
              isLoading={overviewQ.isLoading}
              error={overviewQ.error}
              onRetry={overviewQ.refetch}
              emptyTitle="No managers found"
              onRowClick={(row) => setSelectedManagerId(row.managerId)}
            />
          </CardContent>
        </Card>

        {/* Detail panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manager Detail</CardTitle>
            <CardDescription>
              {detail?.manager ? `${detail.manager.name} · ${detail.manager.email}` : 'Select a manager to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <AsyncSection
              isLoading={detailQ.isLoading}
              error={detailQ.error}
              data={selectedManagerId ? detail : null}
              onRetry={detailQ.refetch}
              emptyTitle="No manager selected"
              emptyDescription="Click a row in the managers table to view their detail."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'Total Vehicles', value: detailStats.total },
                  { label: 'Active Vehicles', value: detailStats.active },
                  { label: 'Bookings', value: detailStats.bookings },
                  { label: 'Revenue', value: <Money amount={detailStats.revenue} /> },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-border bg-surface-muted px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
                    <p className="text-lg font-bold font-heading mt-0.5 tabular-nums">{value}</p>
                  </div>
                ))}
              </div>

              <DataTable
                columns={vehicleColumns}
                data={detail?.vehicles || []}
                emptyTitle="No vehicles assigned"
              />
            </AsyncSection>
          </CardContent>
        </Card>
      </div>

      {/* Pending requests */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Vehicle Requests</CardTitle>
            <CardDescription>Pending vehicle account requests from managers</CardDescription>
          </div>
          <Select value={requestStatus} onValueChange={setRequestStatus}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="pt-0">
          <DataTable
            columns={requestColumns}
            data={requests}
            isLoading={requestsQ.isLoading}
            error={requestsQ.error}
            onRetry={requestsQ.refetch}
            emptyTitle="No requests"
            emptyDescription="There are no vehicle requests matching the current filter."
          />
        </CardContent>
      </Card>

      {/* Audit logs */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Audit Log</CardTitle>
            <CardDescription>Recent operation-level actions</CardDescription>
          </div>
          {managerFilterOptions.length > 0 && (
            <Select value={auditManagerId || '_all'} onValueChange={handleAuditManagerChange}>
              <SelectTrigger className="w-40 h-8 text-xs" aria-label="Filter audit log by manager">
                <SelectValue placeholder="All managers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All managers</SelectItem>
                {managerFilterOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <DataTable
            columns={auditColumns}
            data={auditLogs}
            isLoading={auditQ.isLoading}
            error={auditQ.error}
            onRetry={auditQ.refetch}
            emptyTitle="No audit records"
          />
          {!auditQ.isLoading && !auditQ.error && auditLogs.length > 0 && (
            canLoadMoreAudit ? (
              <div className="flex justify-center pt-3">
                <Button variant="outline" size="sm" onClick={handleLoadMoreAudit} disabled={auditQ.isFetching}>
                  {auditQ.isFetching ? 'Loading…' : 'Load older activity'}
                </Button>
              </div>
            ) : atAuditLimitCap ? (
              <p className="text-xs text-muted-foreground text-center pt-3">
                Showing the most recent {AUDIT_LIMIT_MAX} entries — the most this view can
                currently retrieve. Reaching further back needs server-side cursor pagination
                (tracked as a backend follow-up, see docs/modules/OPERATIONS.md).
              </p>
            ) : null
          )}
        </CardContent>
      </Card>

      {/* Review confirmation dialog */}
      <ConfirmDialog
        open={Boolean(reviewTarget)}
        onOpenChange={(open) => { if (!open) setReviewTarget(null); }}
        title={reviewTarget?.decision === 'APPROVE' ? 'Approve Request' : 'Reject Request'}
        description={
          reviewTarget?.decision === 'APPROVE'
            ? 'This will approve the vehicle account request. This decision is final and cannot be reversed from this portal.'
            : 'This will reject the request. A reason is required. This decision is final and cannot be reversed from this portal.'
        }
        confirmLabel={reviewTarget?.decision === 'APPROVE' ? 'Approve' : 'Reject'}
        requireReason={reviewTarget?.decision === 'REJECT'}
        reasonMaxLength={500}
        pending={reviewM.isPending}
        onConfirm={handleReview}
      />

      {/* Vehicle edit dialog */}
      <FormDialog
        open={Boolean(editVehicle)}
        onOpenChange={(open) => { if (!open) setEditVehicle(null); }}
        title="Edit Vehicle"
        submitLabel="Save Changes"
        onSubmit={handleSaveVehicle}
        pending={updateVehicleM.isPending}
        error={vehicleDialogError}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Vehicle</Label>
            <p className="text-sm text-foreground font-medium">{editVehicle?.vehicleName || 'Unnamed'}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="service-type">Service Type</Label>
            <Select value={editServiceType} onValueChange={setEditServiceType}>
              <SelectTrigger id="service-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
