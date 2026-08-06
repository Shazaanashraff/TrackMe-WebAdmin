import { useMemo, useState } from 'react';
import { Plus, Bus as VehicleIcon, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FormDialog } from '@/components/shared/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  cleanPlateInput, isValidPlate, tidyPlate, PLATE_FORMAT_MESSAGE, PLATE_PLACEHOLDER,
} from '@/lib/number-plate';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  useManagerVehicles,
  useManagerAssignableRoutes,
  useCreateVehicleAccountRequest,
  useUpdateManagerVehicle,
  useRequestDeleteVehicle,
} from '@/hooks/use-vehicles';

const SERVICE_TYPES = ['PUBLIC', 'SCHOOL', 'UNIVERSITY', 'OFFICE'];
const VEHICLE_TYPES = ['AC', 'NON-AC', 'DELUXE', 'SLEEPER'];
const MAINTENANCE_STATUSES = ['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE'];
const CREATE_STEPS = ['Vehicle Details', 'Driver & Access', 'Review & Submit'];

const EMPTY_CREATE = {
  vehicleId: '', vehicleName: '', numberPlate: '',
  routeMode: 'EXISTING', routeId: '',
  seatCapacity: 40, vehicleType: 'AC', serviceType: 'PUBLIC',
  driverName: '', driverEmail: '', driverPhoneNumber: '',
  driverNicNumber: '', driverLicenseCardNumber: '',
  password: '', reason: '',
};

function validateStep(form, step) {
  if (step === 0) {
    if (!form.vehicleId.trim() || !form.vehicleName.trim() || !form.numberPlate.trim()) {
      return form.routeMode === 'CUSTOM'
        ? 'Please complete Vehicle ID, Vehicle Name, and Number Plate.'
        : 'Please complete Vehicle ID, Vehicle Name, Number Plate, and Route.';
    }
    if (!isValidPlate(form.numberPlate)) {
      return PLATE_FORMAT_MESSAGE;
    }
    if (form.routeMode !== 'CUSTOM' && !form.routeId) {
      return 'Please select a route.';
    }
    if (!Number(form.seatCapacity) || Number(form.seatCapacity) <= 0) {
      return 'Seat capacity must be a positive number.';
    }
  }
  if (step === 1) {
    if (!form.password.trim()) return 'Initial password is required.';
    if (form.driverEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.driverEmail)) {
      return 'Driver email format looks invalid.';
    }
  }
  return null;
}

export function ManagerVehiclesPage() {
  const vehiclesQ = useManagerVehicles();
  const routesQ = useManagerAssignableRoutes();
  const createM = useCreateVehicleAccountRequest();
  const updateVehicleM = useUpdateManagerVehicle();
  const deleteReqM = useRequestDeleteVehicle();

  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [createError, setCreateError] = useState(null);

  const [editVehicle, setEditVehicle] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null); // vehicle object

  const vehicles = vehiclesQ.data?.data || [];
  const routes = routesQ.data?.data || [];

  const summary = useMemo(() => {
    const total = vehicles.length;
    const active = vehicles.filter((b) => b.isActive !== false).length;
    return { total, active, inactive: total - active };
  }, [vehicles]);

  const setCreate = (key) => (e) => setCreateForm((p) => ({ ...p, [key]: e.target.value }));

  const openCreate = () => {
    setCreateForm(EMPTY_CREATE);
    setCreateStep(0);
    setCreateError(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (createM.isPending) return;
    setCreateOpen(false);
    setCreateForm(EMPTY_CREATE);
    setCreateStep(0);
    setCreateError(null);
  };

  const handleNext = () => {
    const err = validateStep(createForm, createStep);
    if (err) { setCreateError(err); return; }
    setCreateError(null);
    setCreateStep((s) => Math.min(s + 1, 2));
  };

  const handleBack = () => {
    setCreateError(null);
    setCreateStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    try {
      await createM.mutateAsync({ ...createForm, seatCapacity: Number(createForm.seatCapacity) });
      toast('Vehicle account request submitted');
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
      seatCapacity: vehicle.seatCapacity || 40,
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
    try {
      await updateVehicleM.mutateAsync({
        vehicleId: editVehicle.vehicleId,
        payload: { ...editForm, seatCapacity: Number(editForm.seatCapacity) },
      });
      toast('Vehicle updated');
      setEditVehicle(null);
    } catch (err) {
      setEditError(err);
    }
  };

  const handleDeleteConfirm = async (reason) => {
    if (!deleteTarget) return;
    try {
      await deleteReqM.mutateAsync({ vehicleId: deleteTarget.vehicleId, payload: { reason: reason || '' } });
      toast('Delete request submitted');
      setDeleteTarget(null);
    } catch (err) {
      toast(`Failed: ${err?.message || 'Unknown error'}`);
      setDeleteTarget(null);
    }
  };

  const columns = useMemo(() => [
    { id: 'vehicleId', header: 'Vehicle ID', accessorKey: 'vehicleId' },
    { id: 'vehicleName', header: 'Vehicle Name', accessorKey: 'vehicleName', cell: (i) => <span className="font-medium">{i.getValue()}</span> },
    { id: 'plate', header: 'Plate', accessorKey: 'numberPlate' },
    { id: 'route', header: 'Route', accessorKey: 'routeId' },
    { id: 'service', header: 'Service', accessorKey: 'serviceType' },
    { id: 'state', header: 'Status', accessorKey: 'isActive', enableSorting: false, cell: (i) => <StatusBadge status={i.getValue() !== false ? 'active' : 'inactive'} /> },
    {
      id: 'actions', header: '', accessorKey: '_id', enableSorting: false,
      cell: (i) => {
        const vehicle = i.row.original;
        return (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => openEdit(vehicle)}>Edit</Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(vehicle)}>Delete Req</Button>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Management"
        description="Review managed vehicles, monitor availability, and submit new vehicle account requests."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Vehicle Request
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Vehicles" value={summary.total} icon={VehicleIcon} isLoading={vehiclesQ.isLoading} />
        <StatCard label="Active Fleet" value={summary.active} icon={CheckCircle} isLoading={vehiclesQ.isLoading} />
        <StatCard label="Inactive Fleet" value={summary.inactive} icon={XCircle} isLoading={vehiclesQ.isLoading} />
      </div>

      <DataTable
        columns={columns}
        data={vehicles}
        isLoading={vehiclesQ.isLoading}
        error={vehiclesQ.error}
        onRetry={vehiclesQ.refetch}
        emptyTitle="No vehicles yet"
        emptyDescription="Submit a vehicle account request to get started."
      />

      {/* Multi-step create dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) closeCreate(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Vehicle Request</DialogTitle>
            <DialogDescription>
              Step {createStep + 1} of {CREATE_STEPS.length}: {CREATE_STEPS[createStep]}
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <Alert variant="destructive">
              <AlertDescription>{typeof createError === 'string' ? createError : (createError?.message || 'An error occurred')}</AlertDescription>
            </Alert>
          )}

          {/* Step 0: Vehicle Details */}
          {createStep === 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cb-vehicleid">Vehicle ID</Label>
                  <Input id="cb-vehicleid" value={createForm.vehicleId} onChange={setCreate('vehicleId')} placeholder="VEHICLE-001" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cb-vehiclename">Vehicle Name</Label>
                  <Input id="cb-vehiclename" value={createForm.vehicleName} onChange={setCreate('vehicleName')} placeholder="Express Kandy" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cb-plate">Number Plate</Label>
                <Input
                  id="cb-plate"
                  value={createForm.numberPlate}
                  onChange={(e) => setCreateForm((p) => ({ ...p, numberPlate: cleanPlateInput(e.target.value) }))}
                  onBlur={(e) => setCreateForm((p) => ({ ...p, numberPlate: tidyPlate(e.target.value) }))}
                  placeholder={PLATE_PLACEHOLDER}
                />
              </div>

              <div className="space-y-2">
                <Label>Route Assignment</Label>
                <RadioGroup
                  value={createForm.routeMode}
                  onValueChange={(v) => setCreateForm((p) => ({ ...p, routeMode: v, routeId: v === 'CUSTOM' ? '' : p.routeId }))}
                  className="space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="EXISTING" id="rm-existing" />
                    <Label htmlFor="rm-existing" className="font-normal cursor-pointer">Existing route</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="CUSTOM" id="rm-custom" />
                    <Label htmlFor="rm-custom" className="font-normal cursor-pointer">Custom route (driver records)</Label>
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

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cb-seats">Seat Capacity</Label>
                  <Input id="cb-seats" type="number" min="1" value={createForm.seatCapacity} onChange={setCreate('seatCapacity')} />
                </div>
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
            </div>
          )}

          {/* Step 1: Driver & Access */}
          {createStep === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cb-dname">Driver Name</Label>
                  <Input id="cb-dname" value={createForm.driverName} onChange={setCreate('driverName')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cb-demail">Driver Email</Label>
                  <Input id="cb-demail" type="email" value={createForm.driverEmail} onChange={setCreate('driverEmail')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cb-dphone">Driver Phone</Label>
                  <Input id="cb-dphone" value={createForm.driverPhoneNumber} onChange={setCreate('driverPhoneNumber')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cb-dnic">Driver NIC</Label>
                  <Input id="cb-dnic" value={createForm.driverNicNumber} onChange={setCreate('driverNicNumber')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cb-dlicense">Driver License</Label>
                  <Input id="cb-dlicense" value={createForm.driverLicenseCardNumber} onChange={setCreate('driverLicenseCardNumber')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cb-pw">Initial Password</Label>
                  <Input id="cb-pw" type="password" value={createForm.password} onChange={setCreate('password')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cb-reason">Reason (optional)</Label>
                <Input id="cb-reason" value={createForm.reason} onChange={setCreate('reason')} />
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {createStep === 2 && (
            <div className="rounded-lg border border-border bg-surface-muted p-4 space-y-1.5 text-sm">
              <p><span className="font-semibold">Vehicle:</span> {createForm.vehicleId} · {createForm.vehicleName}</p>
              <p><span className="font-semibold">Number Plate:</span> {createForm.numberPlate}</p>
              <p><span className="font-semibold">Route:</span> {createForm.routeMode === 'CUSTOM' ? 'Driver will record a custom route' : createForm.routeId}</p>
              <p><span className="font-semibold">Capacity:</span> {createForm.seatCapacity} seats</p>
              <p><span className="font-semibold">Type:</span> {createForm.vehicleType} / {createForm.serviceType}</p>
              <p><span className="font-semibold">Driver:</span> {createForm.driverName || 'Not provided'}</p>
              <p><span className="font-semibold">Driver Email:</span> {createForm.driverEmail || 'Not provided'}</p>
              <p><span className="font-semibold">Reason:</span> {createForm.reason || 'Not provided'}</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={closeCreate} disabled={createM.isPending}>Cancel</Button>
            {createStep > 0 && (
              <Button variant="outline" onClick={handleBack} disabled={createM.isPending}>Back</Button>
            )}
            {createStep < 2 ? (
              <Button onClick={handleNext}>Continue</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={createM.isPending}>
                {createM.isPending ? 'Submitting…' : 'Submit Request'}
              </Button>
            )}
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
        error={editError}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eb-name">Vehicle Name</Label>
              <Input id="eb-name" value={editForm.vehicleName || ''} onChange={(e) => setEditForm((p) => ({ ...p, vehicleName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-plate">Number Plate</Label>
              <Input
                id="eb-plate"
                value={editForm.numberPlate || ''}
                onChange={(e) => setEditForm((p) => ({ ...p, numberPlate: cleanPlateInput(e.target.value) }))}
                onBlur={(e) => setEditForm((p) => ({ ...p, numberPlate: tidyPlate(e.target.value) }))}
                placeholder={PLATE_PLACEHOLDER}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-route">Route ID</Label>
              <Input id="eb-route" value={editForm.routeId || ''} onChange={(e) => setEditForm((p) => ({ ...p, routeId: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-seats">Seat Capacity</Label>
              <Input id="eb-seats" type="number" value={editForm.seatCapacity || ''} onChange={(e) => setEditForm((p) => ({ ...p, seatCapacity: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
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

      {/* Delete request confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Request Vehicle Deletion"
        description={`Submit a deletion request for ${deleteTarget?.vehicleName || 'this vehicle'}. A reason is required.`}
        confirmLabel="Submit Request"
        requireReason
        pending={deleteReqM.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
