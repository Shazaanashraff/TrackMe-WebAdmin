import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Users, UserCheck, UserX, Lock, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable } from '@/components/shared/data-table';
import { LiveIndicator } from '@/components/shared/live-indicator';
import { FormDialog } from '@/components/shared/form-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PasswordInput } from '@/components/shared/password-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cleanPlateInput, tidyPlate, PLATE_PLACEHOLDER } from '@/lib/number-plate';
import {
  cleanPhoneInput, isValidPhone, PHONE_FORMAT_MESSAGE, PHONE_PLACEHOLDER,
} from '@/lib/phone-number';
import {
  useOrganizations,
  useManagerDrivers,
  useCreateDriver,
  useUpdateDriver,
  useDeleteDriver,
  useResetDriverPassword,
  useDriverPassword,
  useDriverEnrollmentKey,
  useRotateDriverEnrollmentKey,
  useRevertDriverEnrollmentKey,
} from '@/hooks/use-drivers';
import { trackingState, useManagerFleetLive } from '@/hooks/use-tracking';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The categories an organization can belong to. Public service has no
// organization, so it is not offered here.
const ORG_CATEGORIES = [
  { value: 'SCHOOL', label: 'School' },
  { value: 'UNIVERSITY', label: 'University' },
  { value: 'OFFICE', label: 'Office' },
];

const categoryLabel = (value) =>
  ORG_CATEGORIES.find((c) => c.value === value)?.label || value;

const EMPTY_FORM = {
  name: '',
  email: '',
  phoneNumber: '',
  nicNumber: '',
  licenseCardNumber: '',
  password: '',
  // 'existing' picks from the organization list, 'new' names one to create.
  organizationMode: 'existing',
  organizationCategory: '',
  organizationId: '',
  organizationName: '',
  vehicleNumber: '',
  // Off by default: a driver is enrollable by anyone holding their key unless
  // the manager deliberately puts them behind approval.
  isPrivate: false,
};

// A new driver needs a name, a password and the vehicle they will drive. An
// email is optional because every driver gets a driver ID to sign in with, and
// an organization is optional because public-service drivers have none.
function validate(form, { requirePassword }) {
  const errors = [];
  if (!form.name.trim()) errors.push('Full name is required.');
  // Only on create: the edit dialog has no vehicle field, since a vehicle is
  // reassigned from the Vehicles page.
  if (requirePassword && !form.vehicleNumber.trim()) {
    errors.push('A vehicle number is required.');
  }
  if (form.email.trim() && !emailRegex.test(form.email.trim())) {
    errors.push('Enter a valid email address, or leave it blank.');
  }
  // A part-typed number is worth catching here; the field itself already stops
  // anyone exceeding ten digits (eleven behind a +).
  if (form.phoneNumber.trim() && !isValidPhone(form.phoneNumber)) {
    errors.push(`${PHONE_FORMAT_MESSAGE}.`);
  }
  if (requirePassword && !form.password) errors.push('A password is required.');
  if (requirePassword && form.password && form.password.length < 8) {
    errors.push('The password must be at least 8 characters.');
  }
  if (requirePassword && form.organizationMode === 'new' && form.organizationName.trim()
    && !form.organizationCategory) {
    errors.push('Choose a category for the new organization.');
  }
  return errors;
}

// Only the fields the manager actually filled in are sent. An empty string
// would ask the backend to store a blank email rather than none at all.
function createPayload(form) {
  const organization = form.organizationMode === 'new'
    ? {
      ...(form.organizationName.trim()
        ? { organizationName: form.organizationName.trim() } : {}),
      ...(form.organizationCategory ? { organizationCategory: form.organizationCategory } : {}),
    }
    : (form.organizationId ? { organizationId: form.organizationId } : {});

  return {
    name: form.name.trim(),
    password: form.password,
    ...(form.email.trim() ? { email: form.email.trim() } : {}),
    ...(form.phoneNumber.trim() ? { phoneNumber: form.phoneNumber.trim() } : {}),
    ...(form.nicNumber.trim() ? { nicNumber: form.nicNumber.trim() } : {}),
    ...(form.licenseCardNumber.trim()
      ? { licenseCardNumber: form.licenseCardNumber.trim() } : {}),
    // Canonicalised here as well as on blur, since the form can be submitted
    // with Enter while the field still has focus.
    ...(form.vehicleNumber.trim() ? { vehicleNumber: tidyPlate(form.vehicleNumber) } : {}),
    isPrivate: Boolean(form.isPrivate),
    ...organization,
  };
}

function SectionHeading({ step, children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <span className="text-foreground">{step}</span>
      {' · '}
      {children}
    </h3>
  );
}

// A driver is only ready to drive once they have contact details and a vehicle;
// surfacing that as its own state stops "active" from over-promising.
function driverStatus(driver) {
  if (driver.isActive === false) return { variant: 'danger', label: 'Disabled' };
  if (!driver.setupComplete) return { variant: 'warning', label: 'Setup required' };
  return { variant: 'settled', label: 'Active' };
}

export function ManagerAccountsPage() {
  const navigate = useNavigate();
  const driversQ = useManagerDrivers();
  // Position is per vehicle, but a manager reads this page by driver, so the
  // snapshot is keyed back to the driver the backend reports on each record.
  const fleetQ = useManagerFleetLive();
  // Declared before the mutations because the organization query keys off the
  // category the form is currently on.
  const [form, setForm] = useState(EMPTY_FORM);
  // The organization list is per category, so it only loads once one is picked.
  const organizationsQ = useOrganizations(form.organizationCategory);
  const createM = useCreateDriver();
  const updateM = useUpdateDriver();
  const deleteM = useDeleteDriver();
  const resetPwM = useResetDriverPassword();
  const viewPwM = useDriverPassword();
  const revealKeyM = useDriverEnrollmentKey();
  const rotateKeyM = useRotateDriverEnrollmentKey();
  const revertKeyM = useRevertDriverEnrollmentKey();

  // Creating expands an inline onboarding card; editing still uses a dialog,
  // since an edit is a quick correction rather than a walk-through.
  const [onboarding, setOnboarding] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [lastCreated, setLastCreated] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  // Held in state only while the dialog is open, and dropped on close — the
  // password is never kept alongside the cached driver list.
  const [viewedPassword, setViewedPassword] = useState(null);
  const [rotateTarget, setRotateTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Keys are credentials, so they stay hidden until asked for and are held per
  // row rather than fetched with the directory.
  const [revealedKeys, setRevealedKeys] = useState({});
  // driverId -> the last replacement can still be undone.
  const [revertable, setRevertable] = useState({});

  const drivers = driversQ.data?.data || [];
  const organizations = organizationsQ.data?.data || [];

  const liveByDriverId = useMemo(() => {
    const byDriver = new Map();
    (fleetQ.data?.data || []).forEach((record) => {
      if (record.driver?._id) byDriver.set(String(record.driver._id), record);
    });
    return byDriver;
  }, [fleetQ.data]);

  const setField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const stats = useMemo(() => {
    const total = drivers.length;
    const active = drivers.filter((d) => d.isActive !== false && d.setupComplete).length;
    const needsSetup = drivers.filter((d) => d.isActive !== false && !d.setupComplete).length;
    return { total, active, needsSetup };
  }, [drivers]);

  const submitting = createM.isPending || updateM.isPending;

  const startOnboarding = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setServerError(null);
    setOnboarding(true);
  };

  const cancelOnboarding = () => {
    setOnboarding(false);
    setForm(EMPTY_FORM);
    setServerError(null);
  };

  const openEdit = (driver) => {
    setEditTarget(driver);
    setForm({
      ...EMPTY_FORM,
      name: driver.name || '',
      email: driver.email || '',
      phoneNumber: driver.phoneNumber || '',
      nicNumber: driver.nicNumber || '',
      licenseCardNumber: driver.licenseCardNumber || '',
      organizationCategory: driver.organization?.serviceType || '',
      organizationId: driver.organization?._id || '',
      isPrivate: Boolean(driver.isPrivate),
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
            // Sent even when blank, because that is how an email is removed.
            email: form.email.trim(),
            phoneNumber: form.phoneNumber,
            nicNumber: form.nicNumber,
            licenseCardNumber: form.licenseCardNumber,
            organizationId: form.organizationId || null,
            isPrivate: Boolean(form.isPrivate),
          },
        });
        toast('Driver updated successfully');
        setDialogOpen(false);
      } else {
        const result = await createM.mutateAsync(createPayload(form));
        // Shown immediately so the manager can hand it over. It is retrievable
        // later, but surfacing it here saves a round trip.
        if (result?.enrollmentKey) {
          setRevealedKeys((prev) => ({ ...prev, [result.data._id]: result.enrollmentKey }));
        }
        setLastCreated({
          name: result?.data?.name || form.name,
          email: result?.data?.email || '',
          driverCode: result?.data?.driverCode || null,
          vehicle: result?.data?.vehicle || null,
          enrollmentKey: result?.enrollmentKey || null,
        });
        setOnboarding(false);
        setForm(EMPTY_FORM);
        // The server says when the vehicle came off another driver, which is
        // worth repeating verbatim.
        toast(result?.message || 'Driver created');
      }
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

  // The server decides whether an undo is still available, so the option
  // survives a refresh instead of living only in this tab's memory.
  const rememberRevertable = (driverId, canRevert) =>
    setRevertable((prev) => ({ ...prev, [driverId]: Boolean(canRevert) }));

  const handleRevealKey = async (driver) => {
    try {
      const result = await revealKeyM.mutateAsync({ driverId: driver._id });
      setRevealedKeys((prev) => ({ ...prev, [driver._id]: result?.data?.enrollmentKey }));
      rememberRevertable(driver._id, result?.data?.canRevert);
    } catch (err) {
      toast(`Failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleConfirmRotateKey = async () => {
    if (!rotateTarget) return;
    const driver = rotateTarget;
    try {
      const result = await rotateKeyM.mutateAsync({ driverId: driver._id });
      setRevealedKeys((prev) => ({ ...prev, [driver._id]: result?.data?.enrollmentKey }));
      rememberRevertable(driver._id, result?.data?.canRevert ?? true);
      setRotateTarget(null);
      // Offered right here as well as in the row menu, because the moment a
      // manager realises they rotated the wrong driver is this one.
      toast('Enrollment key replaced. The old key no longer works.', {
        action: { label: 'Undo', onClick: () => handleRevertKey(driver) },
      });
    } catch (err) {
      setRotateTarget(null);
      toast(`Failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleRevertKey = async (driver) => {
    try {
      const result = await revertKeyM.mutateAsync({ driverId: driver._id });
      setRevealedKeys((prev) => ({ ...prev, [driver._id]: result?.data?.enrollmentKey }));
      rememberRevertable(driver._id, false);
      toast('Previous enrollment key restored. The replacement no longer works.');
    } catch (err) {
      // A 409 means the undo was already spent — say that rather than "failed".
      rememberRevertable(driver._id, false);
      toast(err?.message || 'Could not restore the previous enrollment key');
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

  const handleViewPassword = async (driver) => {
    try {
      const res = await viewPwM.mutateAsync({ driverId: driver._id });
      setViewedPassword({ driver, password: res?.data?.password || '' });
    } catch (err) {
      // The two expected refusals are worth distinguishing: one is a server
      // setting, the other means this driver simply needs a reset.
      if (err?.code === 'PASSWORD_RECOVERY_DISABLED') {
        toast('Viewing driver passwords is switched off on this server');
      } else if (err?.code === 'PASSWORD_NOT_RECOVERABLE') {
        toast('No stored password for this driver — reset it to set a new one');
      } else {
        toast(err?.message || 'Could not load the password');
      }
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(viewedPassword.password);
      toast('Password copied');
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
    {
      id: 'driverCode',
      header: 'Driver ID',
      accessorKey: 'driverCode',
      cell: (info) => (info.getValue()
        ? <code className="whitespace-nowrap text-xs">{info.getValue()}</code>
        : <span className="text-muted-foreground">Not issued</span>),
    },
    {
      id: 'email',
      header: 'Email',
      accessorKey: 'email',
      cell: (info) => info.getValue() || <span className="text-muted-foreground">None</span>,
    },
    {
      id: 'organization',
      header: 'Organization',
      accessorKey: 'organization',
      enableSorting: false,
      cell: (info) => {
        const organization = info.getValue();
        if (!organization) return <span className="text-muted-foreground">None</span>;
        return (
          <span>
            {organization.name}
            <span className="text-muted-foreground">
              {' · '}
              {categoryLabel(organization.serviceType)}
            </span>
          </span>
        );
      },
    },
    {
      id: 'phoneNumber',
      header: 'Phone',
      accessorKey: 'phoneNumber',
      cell: (info) => info.getValue() || 'None',
    },
    {
      id: 'vehicle',
      header: 'Vehicle',
      accessorKey: 'vehicle',
      enableSorting: false,
      cell: (info) => {
        const vehicle = info.getValue();
        if (!vehicle) return <span className="text-muted-foreground">Unassigned</span>;
        // The plate is what a manager actually recognises a bus by. The internal
        // vehicleId was the longest string in the row and added no meaning at a
        // glance — it stays available on the Vehicles page. Fall back to it only
        // if a record somehow has no plate, so the cell is never blank.
        return <span className="tabular-nums">{vehicle.numberPlate || vehicle.vehicleId}</span>;
      },
    },
    {
      // Whether this driver is broadcasting right now, and a way straight to
      // the map when they are. Kept apart from the Status column, which is
      // about the account rather than the journey.
      id: 'location',
      header: 'Location',
      accessorKey: '_id',
      enableSorting: false,
      cell: (info) => {
        const driver = info.row.original;
        if (!driver.vehicle) {
          return <span className="text-muted-foreground">No vehicle</span>;
        }

        const record = liveByDriverId.get(String(driver._id));
        const state = record ? trackingState(record) : 'offline';
        // Offline is not a destination: there is no position to open, so the
        // cell states it rather than offering a click that shows nothing.
        if (state === 'offline') {
          return (
            <span title={fleetQ.isLoading ? 'Loading current positions…' : 'Not sharing a location right now'}>
              <LiveIndicator state="offline" />
            </span>
          );
        }

        return (
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 px-2"
            aria-label={`Track ${driver.name} on the live map`}
            title={`Track ${driver.name} on the live map`}
            onClick={() => navigate(
              `/manager/tracking?vehicle=${encodeURIComponent(record.vehicleId)}`,
            )}
          >
            <LiveIndicator state={state} />
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </Button>
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
        // Privacy changes what the key does, so it is flagged on the key itself
        // rather than as a column of its own.
        const lock = driver.isPrivate ? (
          <Badge
            variant="warning"
            title="Private: redeeming this key needs your approval"
          >
            <Lock className="h-3 w-3" aria-hidden="true" />
            Approval
          </Badge>
        ) : null;

        if (!key) {
          return (
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => handleRevealKey(driver)}>
                {pending ? 'Loading…' : 'Show key'}
              </Button>
              {lock}
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1.5">
            {lock}
            {/* The key is one token, and wrapping it mid-code makes it
                unreadable and hard to transcribe over the phone. */}
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
              {/* "Rotate" is our word, not the manager's. The label says what
                  happens to the key they hand out; the endpoint keeps the
                  rotate name. */}
              <DropdownMenuItem onSelect={() => setRotateTarget(driver)}>
                Replace enrollment key
              </DropdownMenuItem>
              {revertable[driver._id] && (
                <DropdownMenuItem onSelect={() => handleRevertKey(driver)}>
                  Restore previous key
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => handleViewPassword(driver)}>
                View password
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
  ], [
    revealedKeys, revertable, revealKeyM.isPending, revealKeyM.variables,
    liveByDriverId, fleetQ.isLoading, navigate,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers"
        description="Manage driver accounts, their assigned vehicles, and passenger enrollment keys."
        actions={
          <Button
            variant={onboarding ? 'outline' : 'default'}
            onClick={onboarding ? cancelOnboarding : startOnboarding}
          >
            {onboarding ? 'Close form' : (
              <>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Driver
              </>
            )}
          </Button>
        }
      />

      {onboarding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a driver</CardTitle>
          </CardHeader>
          <CardContent>
            {/* noValidate so a bad email raises this page's own error banner
                rather than a native browser tooltip that silently blocks
                submission. */}
            <form
              noValidate
              className="divide-y divide-border"
              onSubmit={(e) => { e.preventDefault(); handleSave(); }}
            >
              <section className="space-y-4 pb-6">
                <SectionHeading step={1}>Driver details</SectionHeading>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ob-name">Full name</Label>
                    <Input
                      id="ob-name"
                      value={form.name}
                      onChange={setField('name')}
                      placeholder="Enter full name"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ob-phone">Phone number</Label>
                    <Input
                      id="ob-phone"
                      type="tel"
                      value={form.phoneNumber}
                      // Stops at ten digits, or eleven behind a + for +94.
                      onChange={(e) => setForm((p) => ({
                        ...p, phoneNumber: cleanPhoneInput(e.target.value),
                      }))}
                      placeholder={PHONE_PLACEHOLDER}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ob-email">Email (optional)</Label>
                    <Input
                      id="ob-email"
                      type="email"
                      value={form.email}
                      onChange={setField('email')}
                      placeholder="driver@company.com"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ob-nic">NIC number (optional)</Label>
                    <Input
                      id="ob-nic"
                      value={form.nicNumber}
                      onChange={(e) => setForm((p) => ({
                        ...p, nicNumber: e.target.value.toUpperCase(),
                      }))}
                      placeholder="2000XXXXXXXX"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ob-licence">Licence card number (optional)</Label>
                    <Input
                      id="ob-licence"
                      value={form.licenseCardNumber}
                      onChange={(e) => setForm((p) => ({
                        ...p, licenseCardNumber: e.target.value.toUpperCase(),
                      }))}
                      placeholder="BXXXXXXX"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4 py-6">
                <SectionHeading step={2}>Organization</SectionHeading>

                {/* Picking from the list and adding a new one are the same
                    decision, so they share one control rather than hiding the
                    second behind a separate dialog. */}
                <div
                  role="group"
                  aria-label="How to set the organization"
                  className="inline-flex rounded-full bg-surface-muted p-1"
                >
                  {[
                    { value: 'existing', label: 'Choose existing' },
                    { value: 'new', label: 'Create new' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={form.organizationMode === option.value}
                      onClick={() => setForm((p) => ({
                        ...p,
                        organizationMode: option.value,
                        organizationId: '',
                        organizationName: '',
                      }))}
                      className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                        form.organizationMode === option.value
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ob-org-category">Organization category</Label>
                    <Select
                      value={form.organizationCategory}
                      onValueChange={(value) => setForm((p) => ({
                        ...p, organizationCategory: value, organizationId: '',
                      }))}
                    >
                      <SelectTrigger id="ob-org-category">
                        <SelectValue placeholder="Select category…" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORG_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {form.organizationMode === 'existing' ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="ob-org">Organization</Label>
                      <Select
                        value={form.organizationId}
                        onValueChange={(value) => setForm((p) => ({ ...p, organizationId: value }))}
                        disabled={!form.organizationCategory || organizationsQ.isLoading}
                      >
                        <SelectTrigger id="ob-org">
                          <SelectValue
                            placeholder={
                              form.organizationCategory
                                ? 'Select an organization…'
                                : 'Choose a category first'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              No organizations yet. Use Create new.
                            </div>
                          ) : (
                            organizations.map((organization) => (
                              <SelectItem key={organization._id} value={organization._id}>
                                {organization.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="ob-org-new">Organization name</Label>
                      <Input
                        id="ob-org-new"
                        value={form.organizationName}
                        onChange={setField('organizationName')}
                        placeholder={
                          form.organizationCategory
                            ? `Name of the ${categoryLabel(form.organizationCategory).toLowerCase()}`
                            : 'Choose a category first'
                        }
                        disabled={!form.organizationCategory}
                        autoComplete="off"
                      />
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4 pt-6">
                <SectionHeading step={3}>Vehicle and app access</SectionHeading>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ob-vehicle">Vehicle number</Label>
                    <Input
                      id="ob-vehicle"
                      value={form.vehicleNumber}
                      // Plates and vehicle IDs are both upper case, so "pf2327"
                      // becomes "PF2327" as it is typed.
                      onChange={(e) => setForm((p) => ({
                        ...p, vehicleNumber: cleanPlateInput(e.target.value),
                      }))}
                      // The hyphen goes in on blur, and only when the value
                      // reads as a plate: this field also takes a vehicle ID,
                      // which has no format to impose.
                      onBlur={(e) => setForm((p) => ({
                        ...p, vehicleNumber: tidyPlate(e.target.value),
                      }))}
                      placeholder={`${PLATE_PLACEHOLDER} or a vehicle ID`}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ob-password">Password</Label>
                    <PasswordInput
                      id="ob-password"
                      value={form.password}
                      onChange={setField('password')}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="ob-private">Private driver</Label>
                    <p className="text-sm text-muted-foreground">
                      {form.isPrivate
                        ? 'Passengers who redeem this key wait for your approval before they are enrolled.'
                        : 'Anyone with this driver’s enrollment key is enrolled straight away.'}
                    </p>
                  </div>
                  <Switch
                    id="ob-private"
                    checked={form.isPrivate}
                    onCheckedChange={(checked) => setForm((p) => ({ ...p, isPrivate: checked }))}
                  />
                </div>
                {serverError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {typeof serverError === 'string'
                        ? serverError
                        : serverError?.message || 'An error occurred'}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" onClick={cancelOnboarding} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Creating…' : 'Create driver'}
                  </Button>
                </div>
              </section>
            </form>
          </CardContent>
        </Card>
      )}

      {lastCreated && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 py-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Driver ready</p>
              <p className="font-medium text-foreground">{lastCreated.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Driver ID</p>
              <code className="whitespace-nowrap text-sm font-medium">
                {lastCreated.driverCode || 'Not issued'}
              </code>
            </div>
            {lastCreated.email && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Or signs in with
                </p>
                <p className="font-medium text-foreground">{lastCreated.email}</p>
              </div>
            )}
            {lastCreated.vehicle && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Vehicle</p>
                <p className="font-medium text-foreground">{lastCreated.vehicle.vehicleId}</p>
              </div>
            )}
            {lastCreated.enrollmentKey && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Passenger enrollment key
                </p>
                <code className="whitespace-nowrap text-sm font-medium">
                  {lastCreated.enrollmentKey}
                </code>
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => setLastCreated(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

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
        title="Edit Driver"
        submitLabel="Save Driver"
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
            <Label htmlFor="drv-email">Email (optional)</Label>
            <Input
              id="drv-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="driver@company.com"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Clearing this leaves the driver signing in with their Driver ID
              {editTarget?.driverCode ? ` (${editTarget.driverCode})` : ''}.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="drv-org-category">Organization category</Label>
              <Select
                value={form.organizationCategory}
                onValueChange={(value) => setForm((p) => ({
                  ...p, organizationCategory: value, organizationId: '',
                }))}
              >
                <SelectTrigger id="drv-org-category">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {ORG_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="drv-org">Organization</Label>
              <Select
                value={form.organizationId}
                onValueChange={(value) => setForm((p) => ({ ...p, organizationId: value }))}
                disabled={!form.organizationCategory}
              >
                <SelectTrigger id="drv-org">
                  <SelectValue
                    placeholder={
                      form.organizationCategory ? 'Select an organization…' : 'Choose a category first'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {organizations.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No organizations in this category
                    </div>
                  ) : (
                    organizations.map((organization) => (
                      <SelectItem key={organization._id} value={organization._id}>
                        {organization.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="drv-phone">Phone</Label>
              <Input
                id="drv-phone"
                value={form.phoneNumber}
                onChange={(e) => setForm((p) => ({
                  ...p, phoneNumber: cleanPhoneInput(e.target.value),
                }))}
                placeholder={PHONE_PLACEHOLDER}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="drv-nic">NIC (optional)</Label>
              <Input
                id="drv-nic"
                value={form.nicNumber}
                onChange={(e) => setForm((p) => ({ ...p, nicNumber: e.target.value }))}
                placeholder="2000XXXXXXXX"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="drv-licence">Licence card number (optional)</Label>
            <Input
              id="drv-licence"
              value={form.licenseCardNumber}
              onChange={(e) => setForm((p) => ({ ...p, licenseCardNumber: e.target.value }))}
              placeholder="BXXXXXXX"
              autoComplete="off"
            />
          </div>
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="drv-private">Private driver</Label>
              <p className="text-sm text-muted-foreground">
                {form.isPrivate
                  ? 'Passengers who redeem this key wait for your approval before they are enrolled.'
                  : 'Anyone with this driver’s enrollment key is enrolled straight away.'}
              </p>
            </div>
            <Switch
              id="drv-private"
              checked={form.isPrivate}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, isPrivate: checked }))}
            />
          </div>
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

      {/* Rotating used to be a single click in the row menu, which is far too
          little friction for an action that invalidates a credential already in
          passengers' hands. It now states the consequence up front. */}
      <ConfirmDialog
        open={Boolean(rotateTarget)}
        onOpenChange={(open) => { if (!open && !rotateKeyM.isPending) setRotateTarget(null); }}
        title={`Replace ${rotateTarget?.name || 'this driver'}'s enrollment key?`}
        description="This gives the driver a brand new key and immediately stops the current one working."
        confirmLabel="Replace Key"
        destructive
        pending={rotateKeyM.isPending}
        onConfirm={handleConfirmRotateKey}
      >
        <ul className="space-y-1.5 rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground">
          <li>The key you have already handed out stops working straight away.</li>
          <li>Anyone still to enrol will need the new key from you instead.</li>
          <li className="text-muted-foreground">
            You can undo this once, straight afterwards, to put the old key back.
          </li>
        </ul>
      </ConfirmDialog>

      {/* Read-only, and closed with a plain dismiss — there is nothing to
          submit. The sign-in ID is shown alongside because the password is
          useless without it, and the ID is the half managers reach for the
          enrollment key by mistake. */}
      <ConfirmDialog
        open={Boolean(viewedPassword)}
        onOpenChange={(open) => { if (!open) setViewedPassword(null); }}
        title={`${viewedPassword?.driver?.name || 'Driver'}'s sign-in details`}
        description="Give these to the driver so they can sign in to the driver app."
        confirmLabel="Done"
        onConfirm={() => setViewedPassword(null)}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Driver ID
            </p>
            <code className="block whitespace-nowrap rounded bg-surface-muted px-2 py-1.5 text-sm">
              {viewedPassword?.driver?.driverCode || 'No driver ID'}
            </code>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </p>
            <div className="flex items-center gap-2">
              <code
                data-testid="driver-password-value"
                className="flex-1 break-all rounded bg-surface-muted px-2 py-1.5 text-sm"
              >
                {viewedPassword?.password}
              </code>
              <Button size="sm" variant="ghost" onClick={handleCopyPassword}>Copy</Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            This view is recorded against your account. Reset the password instead of sharing
            it if the driver should be the only one who knows it.
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
