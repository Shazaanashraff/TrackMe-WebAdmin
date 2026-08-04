import { useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Users, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable } from '@/components/shared/data-table';
import { FormDialog } from '@/components/shared/form-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PasswordInput } from '@/components/shared/password-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  useManagerDrivers,
  useCreateDriver,
  useUpdateDriver,
  useDeleteDriver,
  useResetDriverPassword,
  useDriverEnrollmentKey,
  useRotateDriverEnrollmentKey,
} from '@/hooks/use-drivers';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM = {
  name: '',
  email: '',
  phoneNumber: '',
  nicNumber: '',
  licenseCardNumber: '',
  password: '',
};

function validate(form, { requirePassword }) {
  const errors = [];
  if (!form.name.trim()) errors.push('Name is required.');
  if (!form.email.trim()) {
    errors.push('Email is required.');
  } else if (!emailRegex.test(form.email)) {
    errors.push('Enter a valid email address.');
  }
  if (requirePassword && !form.password) errors.push('Password is required.');
  if (requirePassword && form.password && form.password.length < 8) {
    errors.push('Password must be at least 8 characters.');
  }
  return errors;
}

// A driver is only ready to drive once they have contact details and a vehicle;
// surfacing that as its own state stops "active" from over-promising.
function driverStatus(driver) {
  if (driver.isActive === false) return { variant: 'danger', label: 'Disabled' };
  if (!driver.setupComplete) return { variant: 'warning', label: 'Setup required' };
  return { variant: 'settled', label: 'Active' };
}

export function ManagerAccountsPage() {
  const driversQ = useManagerDrivers();
  const createM = useCreateDriver();
  const updateM = useUpdateDriver();
  const deleteM = useDeleteDriver();
  const resetPwM = useResetDriverPassword();
  const revealKeyM = useDriverEnrollmentKey();
  const rotateKeyM = useRotateDriverEnrollmentKey();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [serverError, setServerError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Keys are credentials, so they stay hidden until asked for and are held per
  // row rather than fetched with the directory.
  const [revealedKeys, setRevealedKeys] = useState({});

  const drivers = driversQ.data?.data || [];

  const stats = useMemo(() => {
    const total = drivers.length;
    const active = drivers.filter((d) => d.isActive !== false && d.setupComplete).length;
    const needsSetup = drivers.filter((d) => d.isActive !== false && !d.setupComplete).length;
    return { total, active, needsSetup };
  }, [drivers]);

  const submitting = createM.isPending || updateM.isPending;

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setServerError(null);
    setDialogOpen(true);
  };

  const openEdit = (driver) => {
    setEditTarget(driver);
    setForm({
      name: driver.name || '',
      email: driver.email || '',
      phoneNumber: driver.phoneNumber || '',
      nicNumber: driver.nicNumber || '',
      licenseCardNumber: driver.licenseCardNumber || '',
      password: '',
    });
    setServerError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setServerError(null);
    const errs = validate(form, { requirePassword: !editTarget });
    if (errs.length > 0) {
      setServerError(errs.join(' '));
      return;
    }

    try {
      if (editTarget) {
        await updateM.mutateAsync({
          driverId: editTarget._id,
          payload: {
            name: form.name,
            email: form.email,
            phoneNumber: form.phoneNumber,
            nicNumber: form.nicNumber,
            licenseCardNumber: form.licenseCardNumber,
          },
        });
        toast('Driver updated successfully');
      } else {
        const result = await createM.mutateAsync({
          name: form.name,
          email: form.email,
          password: form.password,
          phoneNumber: form.phoneNumber,
          nicNumber: form.nicNumber,
          licenseCardNumber: form.licenseCardNumber,
        });
        // Shown immediately so the manager can hand it over — it is retrievable
        // later, but surfacing it here saves a round trip.
        if (result?.enrollmentKey) {
          setRevealedKeys((prev) => ({ ...prev, [result.data._id]: result.enrollmentKey }));
        }
        toast(`Driver created — enrollment key ${result?.enrollmentKey || ''}`.trim());
      }
      setDialogOpen(false);
    } catch (err) {
      setServerError(err);
    }
  };

  const handleToggleActive = async (driver) => {
    try {
      await updateM.mutateAsync({
        driverId: driver._id,
        payload: { isActive: driver.isActive === false },
      });
      toast(`Driver ${driver.isActive === false ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast(`Failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleRevealKey = async (driver) => {
    try {
      const result = await revealKeyM.mutateAsync({ driverId: driver._id });
      setRevealedKeys((prev) => ({ ...prev, [driver._id]: result?.data?.enrollmentKey }));
    } catch (err) {
      toast(`Failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleRotateKey = async (driver) => {
    try {
      const result = await rotateKeyM.mutateAsync({ driverId: driver._id });
      setRevealedKeys((prev) => ({ ...prev, [driver._id]: result?.data?.enrollmentKey }));
      toast('Enrollment key rotated — the previous key no longer works');
    } catch (err) {
      toast(`Failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleCopyKey = async (driverId) => {
    try {
      await navigator.clipboard.writeText(revealedKeys[driverId]);
      toast('Enrollment key copied');
    } catch {
      toast('Could not copy to clipboard');
    }
  };

  const handleConfirmReset = async () => {
    if (!resetTarget) return;
    if (newPassword.length < 8) {
      toast('Password must be at least 8 characters');
      return;
    }
    try {
      await resetPwM.mutateAsync({ driverId: resetTarget._id, password: newPassword });
      setResetTarget(null);
      setNewPassword('');
      toast('Password updated successfully');
    } catch (err) {
      toast(`Failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteM.mutateAsync({ driverId: deleteTarget._id });
      setDeleteTarget(null);
      toast('Driver deleted');
    } catch (err) {
      // The backend refuses while a vehicle is still assigned; surface that
      // reason rather than a generic failure.
      toast(err?.message || 'Could not delete driver');
      setDeleteTarget(null);
    }
  };

  const columns = useMemo(() => [
    {
      id: 'name',
      header: 'Driver',
      accessorKey: 'name',
      cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
    },
    { id: 'email', header: 'Email', accessorKey: 'email' },
    {
      id: 'phoneNumber',
      header: 'Phone',
      accessorKey: 'phoneNumber',
      cell: (info) => info.getValue() || '—',
    },
    {
      id: 'vehicle',
      header: 'Vehicle',
      accessorKey: 'vehicle',
      enableSorting: false,
      cell: (info) => {
        const vehicle = info.getValue();
        if (!vehicle) return <span className="text-muted-foreground">Unassigned</span>;
        return (
          <span className="tabular-nums">
            {vehicle.vehicleId}
            <span className="text-muted-foreground"> · {vehicle.numberPlate}</span>
          </span>
        );
      },
    },
    {
      id: 'enrollmentKey',
      header: 'Enrollment key',
      accessorKey: '_id',
      enableSorting: false,
      cell: (info) => {
        const driver = info.row.original;
        const key = revealedKeys[driver._id];
        const pending = revealKeyM.isPending && revealKeyM.variables?.driverId === driver._id;

        if (!key) {
          return (
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => handleRevealKey(driver)}>
              {pending ? 'Loading…' : 'Show key'}
            </Button>
          );
        }

        return (
          <div className="flex items-center gap-1.5">
            {/* The key is one token — wrapping it mid-code makes it unreadable
                and hard to transcribe over the phone. */}
            <code className="whitespace-nowrap rounded bg-surface-muted px-1.5 py-0.5 text-xs">
              {key}
            </code>
            <Button size="sm" variant="ghost" onClick={() => handleCopyKey(driver._id)}>Copy</Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRevealedKeys((prev) => {
                const next = { ...prev };
                delete next[driver._id];
                return next;
              })}
            >
              Hide
            </Button>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'isActive',
      cell: (info) => {
        const { variant, label } = driverStatus(info.row.original);
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      id: 'actions',
      header: '',
      accessorKey: '_id',
      enableSorting: false,
      cell: (info) => {
        const driver = info.row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label={`Actions for ${driver.name}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => openEdit(driver)}>Edit driver</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleRotateKey(driver)}>
                Rotate enrollment key
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setResetTarget(driver)}>
                Reset password
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleToggleActive(driver)}>
                {driver.isActive === false ? 'Enable driver' : 'Disable driver'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeleteTarget(driver)}
              >
                Delete driver
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [revealedKeys, revealKeyM.isPending, revealKeyM.variables]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers"
        description="Manage driver accounts, their assigned vehicles, and passenger enrollment keys."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Driver
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Drivers" value={stats.total} icon={Users} isLoading={driversQ.isLoading} />
        <StatCard label="Active" value={stats.active} icon={UserCheck} isLoading={driversQ.isLoading} />
        <StatCard label="Setup Required" value={stats.needsSetup} icon={UserX} isLoading={driversQ.isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Driver directory</CardTitle>
          <CardDescription>
            Every driver you manage, with their assigned vehicle and enrollment key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={drivers}
            isLoading={driversQ.isLoading}
            error={driversQ.error}
            onRetry={driversQ.refetch}
            emptyTitle="No drivers yet"
            emptyDescription="Add your first driver to get started."
            totalCount={drivers.length}
          />
        </CardContent>
      </Card>

      <FormDialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!submitting) setDialogOpen(open); }}
        title={editTarget ? 'Edit Driver' : 'Add Driver'}
        submitLabel={editTarget ? 'Save Driver' : 'Create Driver'}
        onSubmit={handleSave}
        pending={submitting}
        error={serverError}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="drv-name">Name</Label>
            <Input
              id="drv-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Enter full name"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="drv-email">Email</Label>
            <Input
              id="drv-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="driver@company.com"
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="drv-phone">Phone</Label>
              <Input
                id="drv-phone"
                value={form.phoneNumber}
                onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                placeholder="07X XXX XXXX"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="drv-nic">NIC</Label>
              <Input
                id="drv-nic"
                value={form.nicNumber}
                onChange={(e) => setForm((p) => ({ ...p, nicNumber: e.target.value }))}
                placeholder="Optional"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="drv-licence">Licence card number</Label>
            <Input
              id="drv-licence"
              value={form.licenseCardNumber}
              onChange={(e) => setForm((p) => ({ ...p, licenseCardNumber: e.target.value }))}
              placeholder="Optional"
              autoComplete="off"
            />
          </div>
          {!editTarget && (
            <div className="space-y-1.5">
              <Label htmlFor="drv-password">Password</Label>
              <PasswordInput
                id="drv-password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <p className="text-sm text-muted-foreground">
                Share this with the driver directly. An enrollment key is generated
                automatically for their passengers.
              </p>
            </div>
          )}
        </div>
      </FormDialog>

      <FormDialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => { if (!open && !resetPwM.isPending) { setResetTarget(null); setNewPassword(''); } }}
        title={`Reset ${resetTarget?.name || 'driver'}'s password`}
        submitLabel="Update Password"
        onSubmit={handleConfirmReset}
        pending={resetPwM.isPending}
      >
        <div className="space-y-1.5">
          <Label htmlFor="drv-new-password">New password</Label>
          <PasswordInput
            id="drv-new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open && !deleteM.isPending) setDeleteTarget(null); }}
        title={`Delete ${deleteTarget?.name || 'this driver'}?`}
        description="This permanently deletes the driver account and their enrollment key. A driver still assigned to a vehicle cannot be deleted."
        confirmLabel="Delete Driver"
        destructive
        pending={deleteM.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
