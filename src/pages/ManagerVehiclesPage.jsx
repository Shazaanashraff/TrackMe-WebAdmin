import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { StaleChip } from '@/components/shared/stale-chip';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FormDialog } from '@/components/shared/form-dialog';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  cleanPlateInput, isValidPlate, tidyPlate, PLATE_FORMAT_MESSAGE, PLATE_PLACEHOLDER,
} from '@/lib/number-plate';
import { SERVICE_TYPES } from '@/lib/serviceTypes';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useManagerVehicles,
  useManagerAssignableRoutes,
  useManagerRequests,
  useCreateManagerVehicle,
  useUpdateManagerVehicle,
  useRequestDeleteVehicle,
} from '@/hooks/use-vehicles';
import { useOrganizations } from '@/hooks/use-drivers';

// Public service has no organization, so it is not offered here.
const ORG_CATEGORIES = [
  { value: 'SCHOOL', label: 'School' },
  { value: 'UNIVERSITY', label: 'University' },
  { value: 'OFFICE', label: 'Office' },
];
const VEHICLE_TYPES = ['AC', 'NON-AC', 'DELUXE', 'SLEEPER'];
const MAINTENANCE_STATUSES = ['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE'];
const EMPTY_CREATE = {
  vehicleId: '', vehicleName: '', numberPlate: '',
  routeMode: 'EXISTING', routeId: '',
  vehicleType: 'AC', serviceType: 'PUBLIC',
  organizationCategory: '', organizationId: '',
  reason: '',
};

// A vehicle needs an ID and a plate. Who drives it is set up on the Drivers
// page, so nothing about a driver is collected here.
function validateCreate(form, vehicles = []) {
  if (!form.vehicleId.trim() || !form.numberPlate.trim()) {
    return 'Please complete Vehicle ID and Number Plate.';
  }
  if (!isValidPlate(form.numberPlate)) {
    return PLATE_FORMAT_MESSAGE;
  }
  const enteredId = form.vehicleId.trim().toLowerCase();
  if (vehicles.some((v) => (v.vehicleId || '').trim().toLowerCase() === enteredId)) {
    return `Vehicle ID "${form.vehicleId.trim()}" is already in use.`;
  }
  return null;
}

// Stored values are upper-case enums; show them the way a person would write them.
const sentenceCase = (value) => (value
  ? value.charAt(0) + value.slice(1).toLowerCase()
  : '');

function IconAction({ label, onClick, disabled, destructive = false, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* A disabled button swallows pointer events, so the span keeps the hover target alive. */}
        <span className="inline-flex">
          <Button
            size="icon"
            variant="ghost"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={destructive ? 'text-destructive hover:text-destructive' : undefined}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ManagerVehiclesPage() {
  // Loads the manager's full fleet, not a page of it — a deliberate, documented
  // tradeoff (issue #10), not an oversight. See docs/modules/BUSES.md §6.
  const isOnline = useOnlineStatus();
  const vehiclesQ = useManagerVehicles();
  const requestsQ = useManagerRequests();
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  // Per category, so it only loads once one is picked.
  const organizationsQ = useOrganizations(createForm.organizationCategory);
  const createM = useCreateManagerVehicle();
  const updateVehicleM = useUpdateManagerVehicle();
  const deleteReqM = useRequestDeleteVehicle();

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const [editVehicle, setEditVehicle] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null); // vehicle object
  const [deleteError, setDeleteError] = useState(null);

  // Only the create/edit dialogs' route picker needs the full assignable-routes
  // list — the table gets each row's route name inline from useManagerVehicles
  // now (issue #18), so this stays off until a dialog that needs it is open.
  const routesQ = useManagerAssignableRoutes({ enabled: createOpen || !!editVehicle });

  const vehicles = vehiclesQ.data?.data || [];
  const routes = useMemo(() => routesQ.data?.data || [], [routesQ.data]);
  const organizations = organizationsQ.data?.data || [];

  // A delete "request" needs super-admin approval before it does anything —
  // without this, nothing in the table shows a request is even in flight
  // once the confirm dialog closes (issue #66).
  const pendingDeleteVehicleIds = useMemo(() => {
    const requests = requestsQ.data?.data || [];
    return new Set(
      requests
        .filter((r) => r.type === 'DELETE_VEHICLE' && r.status === 'PENDING')
        .map((r) => r.vehicleId)
    );
  }, [requestsQ.data]);

  const setCreate = (key) => (e) => setCreateForm((p) => ({ ...p, [key]: e.target.value }));

  const openCreate = () => {
    setCreateForm(EMPTY_CREATE);
    setCreateError(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (createM.isPending) return;
    setCreateOpen(false);
    setCreateForm(EMPTY_CREATE);
    setCreateError(null);
  };

  // Several drivers' full details can be sitting in this form — an accidental
  // outside-click or Escape shouldn't silently throw that away (issue #8). The
  // explicit Cancel button stays an immediate discard; this only guards the
  // dialog's own dismiss path.
  const isCreateFormDirty = JSON.stringify(createForm) !== JSON.stringify(EMPTY_CREATE);

  const handleCreateOpenChange = (open) => {
    if (open) return;
    if (isCreateFormDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    closeCreate();
  };

  const confirmDiscardCreate = () => {
    setDiscardConfirmOpen(false);
    closeCreate();
  };

  const handleSubmit = async () => {
    const err = validateCreate(createForm, vehicles);
    if (err) { setCreateError(err); return; }
    setCreateError(null);
    try {
      const result = await createM.mutateAsync({ ...createForm });
      if (result?.data?.vehicle) {
        toast('Vehicle created');
      } else {
        // No vehicle in the response means this fleet already has one, so the
        // request went to a super admin for approval instead of being created.
        toast('Vehicle creation request submitted for super admin approval');
      }
      closeCreate();
    } catch (err) {
      setCreateError(err);
    }
  };

  const openEdit = (vehicle) => {
    setEditVehicle(vehicle);
    setEditForm({
      vehicleName: vehicle.vehicleName || '',
      numberPlate: vehicle.numberPlate || '',
      routeId: vehicle.routeId || '',
      vehicleType: vehicle.vehicleType || 'AC',
      serviceType: vehicle.serviceType || 'PUBLIC',
      isActive: vehicle.isActive !== false,
      maintenanceStatus: vehicle.maintenanceStatus || 'ACTIVE',
    });
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editVehicle) return;
    setEditError(null);
    if (!isValidPlate(editForm.numberPlate)) {
      setEditError(PLATE_FORMAT_MESSAGE);
      return;
    }
    try {
      await updateVehicleM.mutateAsync({
        vehicleId: editVehicle.vehicleId,
        payload: { ...editForm },
      });
      toast('Vehicle updated');
      setEditVehicle(null);
    } catch (err) {
      setEditError(err);
    }
  };

  const handleDeleteConfirm = async (reason) => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteReqM.mutateAsync({ vehicleId: deleteTarget.vehicleId, payload: { reason: reason || '' } });
      toast('Delete request submitted');
      setDeleteTarget(null);
    } catch (err) {
      // Keep the dialog open on failure so the error is visible inline
      // (not just a transient toast) and the manager can retry in place.
      setDeleteError(err);
    }
  };

  const renderActions = (vehicle) => (
    <div className="flex items-center justify-end gap-0.5 coarse:gap-2">
      <IconAction
        label={isOnline ? 'Edit vehicle' : 'Edit vehicle (unavailable offline)'}
        disabled={!isOnline}
        onClick={() => openEdit(vehicle)}
      >
        <Pencil className="h-4 w-4" />
      </IconAction>
      <IconAction
        label={isOnline ? 'Request deletion' : 'Request deletion (unavailable offline)'}
        disabled={!isOnline}
        destructive
        onClick={() => { setDeleteError(null); setDeleteTarget(vehicle); }}
      >
        <Trash2 className="h-4 w-4" />
      </IconAction>
    </div>
  );

  const columns = useMemo(() => [
    {
      id: 'vehicle',
      header: 'Vehicle',
      accessorKey: 'vehicleName',
      cell: (i) => {
        const vehicle = i.row.original;
        return (
          <div>
            <span className="font-medium">{vehicle.vehicleName || vehicle.numberPlate}</span>
            <div className="font-mono text-xs tabular-nums text-muted-foreground">{vehicle.numberPlate}</div>
          </div>
        );
      },
    },
    {
      id: 'driver',
      header: 'Driver',
      accessorKey: 'driverId',
      enableSorting: false,
      cell: (i) => (i.getValue()?.name
        ? i.getValue().name
        : <span className="text-muted-foreground">—</span>),
    },
    {
      id: 'organization',
      header: 'Organization',
      accessorKey: 'organization',
      enableSorting: false,
      cell: (i) => (i.getValue()?.name
        ? i.getValue().name
        : <span className="text-muted-foreground">—</span>),
    },
    {
      id: 'route',
      header: 'Route',
      accessorKey: 'routeId',
      cell: (i) => {
        const routeId = i.getValue();
        if (!routeId) return <span className="text-muted-foreground">—</span>;
        const routeName = i.row.original.routeName;
        return routeName ? `${routeName} (${routeId})` : routeId;
      },
    },
    { id: 'service', header: 'Service', accessorKey: 'serviceType', cell: (i) => sentenceCase(i.getValue()) },
    {
      id: 'state',
      header: 'Status',
      accessorKey: 'isActive',
      enableSorting: false,
      cell: (i) => {
        const vehicle = i.row.original;
        return (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={i.getValue() !== false ? 'active' : 'inactive'} />
            {pendingDeleteVehicleIds.has(vehicle.vehicleId) ? (
              <StatusBadge status="pending" label="Deletion pending" />
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'actions', header: '', accessorKey: '_id', enableSorting: false,
      cell: (i) => renderActions(i.row.original),
    },
    // renderActions closes over openEdit, which is recreated every render; the
    // dependency list is the set of values it actually reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [pendingDeleteVehicleIds, isOnline]);

  // Below md the 9-column table cannot fit, so each row renders as a card.
  // Nothing is dropped: a card list has no width limit to fight, and this
  // table has no row-detail view, so a hidden field would be unreachable.
  // Not memoized: `openEdit` is recreated each render anyway, so a useCallback
  // here would never hit, and DataTable does not memo on this prop.
  const renderMobileCard = (vehicle) => {
    const driverName = vehicle.driverId?.name;
    const orgName = vehicle.organization?.name;
    const routeLabel = vehicle.routeId
      ? (vehicle.routeName ? `${vehicle.routeName} (${vehicle.routeId})` : vehicle.routeId)
      : '—';

    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{vehicle.vehicleName || vehicle.numberPlate}</p>
            <p className="font-mono text-xs tabular-nums text-muted-foreground">{vehicle.numberPlate}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
            <StatusBadge status={vehicle.isActive !== false ? 'active' : 'inactive'} />
            {pendingDeleteVehicleIds.has(vehicle.vehicleId) ? (
              <StatusBadge status="pending" label="Deletion pending" />
            ) : null}
          </div>
        </div>

        <dl className="space-y-1 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Driver</dt>
            <dd className={cn('text-right', !driverName && 'text-muted-foreground')}>
              {driverName || '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">Route</dt>
            <dd className={cn('text-right break-words', !vehicle.routeId && 'text-muted-foreground')}>
              {routeLabel}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Service</dt>
            <dd className="text-right">{sentenceCase(vehicle.serviceType)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Organization</dt>
            <dd className={cn('text-right', !orgName && 'text-muted-foreground')}>
              {orgName || '—'}
            </dd>
          </div>
        </dl>

        <div className="pt-1">{renderActions(vehicle)}</div>
      </div>
    );
  };

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        className="mb-0"
        actions={
          <Button onClick={openCreate} disabled={!isOnline} title={isOnline ? undefined : 'Unavailable offline'}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Vehicle
          </Button>
        }
      />

      {vehicles.length > 0 && (
        <div className="flex justify-end">
          <StaleChip updatedAt={vehiclesQ.dataUpdatedAt} offline={!isOnline} />
        </div>
      )}

      <DataTable
        columns={columns}
        data={vehicles}
        isLoading={vehiclesQ.isLoading}
        error={vehiclesQ.error}
        onRetry={vehiclesQ.refetch}
        emptyTitle="No vehicles yet"
        emptyDescription="Add your first vehicle to get started."
        renderMobileCard={renderMobileCard}
      />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
          </DialogHeader>

          {createError && (
            <Alert variant="destructive">
              <AlertDescription>{typeof createError === 'string' ? createError : (createError?.message || 'An error occurred')}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cb-vehicleid" required>Vehicle ID</Label>
                <Input id="cb-vehicleid" aria-required="true" value={createForm.vehicleId} onChange={setCreate('vehicleId')} placeholder="VEHICLE-001" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cb-vehiclename">Vehicle Name (optional)</Label>
                <Input
                  id="cb-vehiclename"
                  value={createForm.vehicleName}
                  onChange={setCreate('vehicleName')}
                  placeholder="Named after its plate if left blank"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cb-plate" required>Number Plate</Label>
              <Input
                id="cb-plate"
                aria-required="true"
                value={createForm.numberPlate}
                onChange={(e) => setCreateForm((p) => ({ ...p, numberPlate: cleanPlateInput(e.target.value) }))}
                onBlur={(e) => setCreateForm((p) => ({ ...p, numberPlate: tidyPlate(e.target.value) }))}
                placeholder={PLATE_PLACEHOLDER}
              />
            </div>

            {/* The same organization the vehicle's drivers belong to. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cb-org-category">Organization category (optional)</Label>
                <Select
                  value={createForm.organizationCategory}
                  onValueChange={(v) => setCreateForm((p) => ({
                    ...p, organizationCategory: v, organizationId: '',
                  }))}
                >
                  <SelectTrigger id="cb-org-category">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cb-org">Organization</Label>
                <Select
                  value={createForm.organizationId}
                  onValueChange={(v) => setCreateForm((p) => ({ ...p, organizationId: v }))}
                  disabled={!createForm.organizationCategory}
                >
                  <SelectTrigger id="cb-org">
                    <SelectValue
                      placeholder={
                        createForm.organizationCategory
                          ? 'Select an organization…'
                          : 'Choose a category first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No organizations in this category
                      </div>
                    ) : (
                      organizations.map((o) => (
                        <SelectItem key={o._id} value={o._id}>{o.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Route Assignment (optional)</Label>
              <RadioGroup
                value={createForm.routeMode}
                onValueChange={(v) => setCreateForm((p) => ({ ...p, routeMode: v, routeId: v === 'CUSTOM' ? '' : p.routeId }))}
                className="space-y-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="EXISTING" id="rm-existing" />
                  <Label htmlFor="rm-existing" className="flex-1 inline-flex items-center coarse:min-h-11 font-normal cursor-pointer">Existing route</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="CUSTOM" id="rm-custom" />
                  <Label htmlFor="rm-custom" className="flex-1 inline-flex items-center coarse:min-h-11 font-normal cursor-pointer">Custom route (driver records)</Label>
                </div>
              </RadioGroup>
            </div>

            {createForm.routeMode === 'CUSTOM' ? (
              <Alert>
                <AlertDescription>No route needed yet. The driver will record the route by driving it.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="cb-route">Route</Label>
                <Select value={createForm.routeId} onValueChange={(v) => setCreateForm((p) => ({ ...p, routeId: v }))}>
                  <SelectTrigger id="cb-route">
                    <SelectValue placeholder="Select a route" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No routes found</div>
                    ) : (
                      routes.map((r) => (
                        <SelectItem key={r.routeId} value={r.routeId}>
                          {r.routeName || r.routeId} ({r.routeId}){r.visibility === 'PRIVATE' ? ' · Custom' : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cb-vehicletype">Vehicle Type</Label>
                <Select value={createForm.vehicleType} onValueChange={(v) => setCreateForm((p) => ({ ...p, vehicleType: v }))}>
                  <SelectTrigger id="cb-vehicletype"><SelectValue /></SelectTrigger>
                  <SelectContent>{VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cb-service">Service Type</Label>
                <Select value={createForm.serviceType} onValueChange={(v) => setCreateForm((p) => ({ ...p, serviceType: v }))}>
                  <SelectTrigger id="cb-service"><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {vehicles.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="cb-reason">Note for the approver (optional)</Label>
                <Input id="cb-reason" value={createForm.reason} onChange={setCreate('reason')} />
                <p className="text-xs text-muted-foreground">
                  This is not your first vehicle, so it is sent to a super admin for approval.
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Drivers are added on the{' '}
              <Link to="/manager/accounts" className="inline-flex items-center coarse:min-h-11 font-medium text-primary underline-offset-4 hover:underline">
                Drivers page
              </Link>
              {' '}using this vehicle&apos;s number plate.
            </p>
          </div>

          {!isOnline && (
            <Alert variant="warning">
              <AlertDescription>
                You&apos;re offline. Your entries are kept here — reconnect to submit.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={closeCreate} disabled={createM.isPending}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createM.isPending || !isOnline} title={isOnline ? undefined : 'Unavailable offline'}>
              {createM.isPending
                ? (vehicles.length > 0 ? 'Submitting…' : 'Creating…')
                : (vehicles.length > 0 ? 'Submit Request' : 'Create Vehicle')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <FormDialog
        open={Boolean(editVehicle)}
        onOpenChange={(v) => { if (!v) setEditVehicle(null); }}
        title="Edit Vehicle"
        submitLabel="Save Changes"
        onSubmit={handleSaveEdit}
        pending={updateVehicleM.isPending}
        submitDisabled={!isOnline}
        error={editError}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="eb-vehicleid">Vehicle ID</Label>
            <Input id="eb-vehicleid" value={editVehicle?.vehicleId || ''} disabled readOnly className="font-mono" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="eb-name">Vehicle Name</Label>
              <Input id="eb-name" value={editForm.vehicleName || ''} onChange={(e) => setEditForm((p) => ({ ...p, vehicleName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-plate" required>Number Plate</Label>
              <Input
                id="eb-plate"
                aria-required="true"
                value={editForm.numberPlate || ''}
                onChange={(e) => setEditForm((p) => ({ ...p, numberPlate: cleanPlateInput(e.target.value) }))}
                onBlur={(e) => setEditForm((p) => ({ ...p, numberPlate: tidyPlate(e.target.value) }))}
                placeholder={PLATE_PLACEHOLDER}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-route">Route</Label>
              <Select value={editForm.routeId || ''} onValueChange={(v) => setEditForm((p) => ({ ...p, routeId: v }))}>
                <SelectTrigger id="eb-route">
                  <SelectValue placeholder="Select a route" />
                </SelectTrigger>
                <SelectContent>
                  {editForm.routeId && !routes.some((r) => r.routeId === editForm.routeId) ? (
                    <SelectItem value={editForm.routeId}>{editForm.routeId} (current)</SelectItem>
                  ) : null}
                  {routes.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No routes found</div>
                  ) : (
                    routes.map((r) => (
                      <SelectItem key={r.routeId} value={r.routeId}>
                        {r.routeName || r.routeId} ({r.routeId}){r.visibility === 'PRIVATE' ? ' · Custom' : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="eb-vehicletype">Vehicle Type</Label>
              <Select value={editForm.vehicleType || 'AC'} onValueChange={(v) => setEditForm((p) => ({ ...p, vehicleType: v }))}>
                <SelectTrigger id="eb-vehicletype"><SelectValue /></SelectTrigger>
                <SelectContent>{VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-service">Service Type</Label>
              <Select value={editForm.serviceType || 'PUBLIC'} onValueChange={(v) => setEditForm((p) => ({ ...p, serviceType: v }))}>
                <SelectTrigger id="eb-service"><SelectValue /></SelectTrigger>
                <SelectContent>{SERVICE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-maint">Maintenance</Label>
              <Select value={editForm.maintenanceStatus || 'ACTIVE'} onValueChange={(v) => setEditForm((p) => ({ ...p, maintenanceStatus: v }))}>
                <SelectTrigger id="eb-maint"><SelectValue /></SelectTrigger>
                <SelectContent>{MAINTENANCE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eb-status">Status</Label>
            <Select value={String(editForm.isActive ?? true)} onValueChange={(v) => setEditForm((p) => ({ ...p, isActive: v === 'true' }))}>
              <SelectTrigger id="eb-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      {/* Discard unsaved create-form data on accidental outside-click/Escape */}
      <ConfirmDialog
        open={discardConfirmOpen}
        onOpenChange={setDiscardConfirmOpen}
        title="Discard changes?"
        description="You have unsaved vehicle details. Closing now will discard them."
        confirmLabel="Discard"
        destructive
        onConfirm={confirmDiscardCreate}
      />

      {/* Delete request confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => { if (!v) { setDeleteTarget(null); setDeleteError(null); } }}
        title="Request Vehicle Deletion"
        description={`Submit a deletion request for ${deleteTarget?.vehicleName || 'this vehicle'}. A reason is required.`}
        confirmLabel="Submit Request"
        requireReason
        pending={deleteReqM.isPending}
        confirmDisabled={!isOnline}
        onConfirm={handleDeleteConfirm}
        error={deleteError}
      />
    </div>
    </TooltipProvider>
  );
}
