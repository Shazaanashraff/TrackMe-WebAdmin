import { useEffect, useMemo, useState } from 'react';
import { Activity, Bus, CheckCircle, ClipboardList } from 'lucide-react';
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
  usePendingBusRequests,
  useAuditLogs,
  useReviewBusRequest,
  useUpdateBus,
} from '@/hooks/use-operations';

const SERVICE_TYPES = ['PUBLIC', 'SCHOOL', 'UNIVERSITY', 'OFFICE'];

export function OperationsPage() {
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [reviewTarget, setReviewTarget] = useState(null); // { id, decision }
  const [editBus, setEditBus] = useState(null);
  const [editServiceType, setEditServiceType] = useState('PUBLIC');
  const [requestStatus, setRequestStatus] = useState('PENDING');
  const [auditManagerId, setAuditManagerId] = useState('');
  const [busDialogError, setBusDialogError] = useState(null);

  const overviewQ = useOperationsOverview();
  const detailQ = useOperationManagerDetail(selectedManagerId);
  const requestsQ = usePendingBusRequests({ status: requestStatus });
  const auditQ = useAuditLogs({ limit: 60, managerId: auditManagerId });
  const reviewM = useReviewBusRequest();
  const updateBusM = useUpdateBus();

  // Auto-select first manager once overview loads
  useEffect(() => {
    const rows = overviewQ.data?.data || [];
    if (rows.length > 0 && !selectedManagerId) {
      setSelectedManagerId(rows[0].managerId);
    }
  }, [overviewQ.data, selectedManagerId]);

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
    const buses = detail?.buses || [];
    return {
      total: buses.length,
      active: buses.filter((b) => b.isActive).length,
      bookings: buses.reduce((s, b) => s + (b.bookingMetrics?.totalBookings || 0), 0),
      revenue: buses.reduce((s, b) => s + (b.bookingMetrics?.totalRevenue || 0), 0),
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
      toast(`Failed: ${err?.message || 'Unknown error'}`);
      setReviewTarget(null);
    }
  };

  const handleSaveBus = async () => {
    if (!editBus) return;
    setBusDialogError(null);
    try {
      await updateBusM.mutateAsync({ busId: editBus.busId || editBus._id, payload: { serviceType: editServiceType } });
      toast('Bus updated');
      setEditBus(null);
    } catch (err) {
      setBusDialogError(err);
    }
  };

  const overviewColumns = useMemo(() => [
    { id: 'manager', header: 'Manager', accessorKey: 'managerName', cell: (i) => <span className="font-medium">{i.getValue()}</span> },
    { id: 'buses', header: 'Buses', accessorKey: 'fleet', cell: (i) => i.getValue()?.totalBuses ?? 0 },
    { id: 'bookings', header: 'Bookings', accessorKey: 'bookings', cell: (i) => i.getValue()?.totalBookings ?? 0 },
    { id: 'status', header: 'Status', accessorKey: 'isActive', cell: (i) => <StatusBadge status={i.getValue() ? 'online' : 'offline'} /> },
  ], []);

  const busColumns = useMemo(() => [
    { id: 'name', header: 'Bus', accessorKey: 'busName', cell: (i) => <span className="font-medium">{i.getValue()}</span> },
    { id: 'service', header: 'Service', accessorKey: 'serviceType', cell: (i) => <Badge variant="secondary">{i.getValue() || 'PUBLIC'}</Badge> },
    { id: 'state', header: 'State', accessorKey: 'isActive', cell: (i) => <StatusBadge status={i.getValue() ? 'online' : 'offline'} /> },
    { id: 'rating', header: 'Rating', accessorKey: 'reviewMetrics', cell: (i) => i.getValue()?.averageRating?.toFixed(1) ?? '—' },
    { id: 'bookings', header: 'Bookings', accessorKey: 'bookingMetrics', cell: (i) => i.getValue()?.totalBookings ?? 0 },
    {
      id: 'actions', header: '', accessorKey: '_id', enableSorting: false,
      cell: (i) => (
        <Button size="sm" variant="ghost" onClick={() => { setEditBus(i.row.original); setEditServiceType(i.row.original.serviceType || 'PUBLIC'); setBusDialogError(null); }}>
          Edit
        </Button>
      ),
    },
  ], []);

  const requestColumns = useMemo(() => [
    { id: 'type', header: 'Type', accessorKey: 'type' },
    { id: 'manager', header: 'Manager', accessorKey: 'managerId', cell: (i) => i.getValue()?.name || '—' },
    { id: 'busId', header: 'Bus', accessorKey: 'busId' },
    { id: 'submitted', header: 'Submitted', accessorKey: 'createdAt', cell: (i) => i.getValue() ? <RelativeTime date={i.getValue()} /> : '—' },
    { id: 'reason', header: 'Reason', accessorKey: 'reason', cell: (i) => i.getValue() || '—' },
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
    { id: 'time', header: 'Time', accessorKey: 'createdAt', cell: (i) => i.getValue() ? <RelativeTime date={i.getValue()} /> : '—' },
    { id: 'manager', header: 'Manager', accessorKey: 'managerId', cell: (i) => i.getValue()?.name || '—' },
    { id: 'action', header: 'Action', accessorKey: 'action' },
    { id: 'entity', header: 'Entity', accessorKey: 'entityType' },
    { id: 'actor', header: 'Actor', accessorKey: 'actorId', cell: (i) => i.getValue()?.email || '—' },
  ], []);

  const managerFilterOptions = useMemo(() => overview.map((o) => ({ id: o.managerId, name: o.managerName })), [overview]);

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
        <StatCard label="Audit Records" value={stats.audit} icon={Bus} isLoading={auditQ.isLoading} />
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
              {detail?.manager ? `${detail.manager.name} — ${detail.manager.email}` : 'Select a manager to view details'}
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
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'Total Buses', value: detailStats.total },
                  { label: 'Active Buses', value: detailStats.active },
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
                columns={busColumns}
                data={detail?.buses || []}
                emptyTitle="No buses assigned"
              />
            </AsyncSection>
          </CardContent>
        </Card>
      </div>

      {/* Pending requests */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Bus Requests</CardTitle>
            <CardDescription>Pending bus account requests from managers</CardDescription>
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
            emptyDescription="There are no bus requests matching the current filter."
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
            <Select value={auditManagerId || '_all'} onValueChange={(v) => setAuditManagerId(v === '_all' ? '' : v)}>
              <SelectTrigger className="w-40 h-8 text-xs">
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
        </CardContent>
      </Card>

      {/* Review confirmation dialog */}
      <ConfirmDialog
        open={Boolean(reviewTarget)}
        onOpenChange={(open) => { if (!open) setReviewTarget(null); }}
        title={reviewTarget?.decision === 'APPROVE' ? 'Approve Request' : 'Reject Request'}
        description={
          reviewTarget?.decision === 'APPROVE'
            ? 'This will approve the bus account request.'
            : 'This will reject the request. A reason is required.'
        }
        confirmLabel={reviewTarget?.decision === 'APPROVE' ? 'Approve' : 'Reject'}
        requireReason={reviewTarget?.decision === 'REJECT'}
        pending={reviewM.isPending}
        onConfirm={handleReview}
      />

      {/* Bus edit dialog */}
      <FormDialog
        open={Boolean(editBus)}
        onOpenChange={(open) => { if (!open) setEditBus(null); }}
        title="Edit Bus"
        submitLabel="Save Changes"
        onSubmit={handleSaveBus}
        pending={updateBusM.isPending}
        error={busDialogError}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Bus</Label>
            <p className="text-sm text-foreground font-medium">{editBus?.busName || '—'}</p>
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
