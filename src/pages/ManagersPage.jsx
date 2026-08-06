import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { FormDialog } from '@/components/shared/form-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PasswordInput } from '@/components/shared/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useManagers,
  useCreateManager,
  useUpdateManager,
  useUpdateManagerStatus,
  useDeleteManager,
  useResetManagerPassword,
} from '@/hooks/use-managers';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the backend password rules so the super admin sees the problem before
// the request is sent.
function passwordErrors(password) {
  const errors = [];
  if (password.length < 8 || password.length > 64) {
    errors.push('Password must be between 8 and 64 characters.');
  }
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter.');
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter.');
  if (!/[0-9]/.test(password)) errors.push('Password must contain a number.');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain a special character.');
  return errors;
}

// The confirm field exists to catch typos in a value the super admin cannot
// read back later, so a mismatch is always an error when a password is being set.
function passwordFieldErrors(password, confirmPassword) {
  const errors = passwordErrors(password);
  if (password !== confirmPassword) errors.push('Passwords do not match.');
  return errors;
}

function validate(form, { requirePassword }) {
  const errors = [];
  if (!form.name.trim()) errors.push('Name is required.');
  if (!form.email.trim()) {
    errors.push('Email is required.');
  } else if (!emailRegex.test(form.email)) {
    errors.push('Enter a valid email address.');
  }
  if (requirePassword) {
    if (!form.password) {
      errors.push('Password is required.');
    } else {
      errors.push(...passwordFieldErrors(form.password, form.confirmPassword));
    }
  }
  return errors;
}

const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '' };

export function ManagersPage() {
  const navigate = useNavigate();
  const managersQ = useManagers();
  const createM = useCreateManager();
  const updateM = useUpdateManager();
  const resetPwM = useResetManagerPassword();
  const statusM = useUpdateManagerStatus();
  const deleteM = useDeleteManager();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [serverError, setServerError] = useState(null);

  const rows = managersQ.data?.data || [];

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive !== false).length;
    return { total, active, inactive: total - active };
  }, [rows]);

  const submitting = createM.isPending || updateM.isPending;

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setServerError(null);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditTarget(row);
    // Password is only changed deliberately, so it starts blank on edit.
    setForm({ name: row.name, email: row.email, password: '', confirmPassword: '' });
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
          managerId: editTarget._id,
          payload: { name: form.name, email: form.email },
        });
        toast('Manager updated successfully');
      } else {
        // The super admin sets the password directly, so the account works
        // immediately — no invite email or activation link involved.
        const result = await createM.mutateAsync({
          name: form.name,
          email: form.email,
          password: form.password,
        });
        toast(result?.message || 'Manager created');
      }
      setDialogOpen(false);
    } catch (err) {
      setServerError(err);
    }
  };

  // Edit dialog: setting a new password is optional and separate from saving
  // name/email, so it has its own action.
  const handleSetPassword = async () => {
    if (!editTarget) return;
    setServerError(null);
    const errs = form.password
      ? passwordFieldErrors(form.password, form.confirmPassword)
      : ['Password is required.'];
    if (errs.length > 0) {
      setServerError(errs.join(' '));
      return;
    }
    try {
      await resetPwM.mutateAsync({
        managerId: editTarget._id,
        payload: { password: form.password },
      });
      setForm((p) => ({ ...p, password: '', confirmPassword: '' }));
      toast('Password updated successfully');
    } catch (err) {
      setServerError(err);
    }
  };

  const handleToggleStatus = async (row) => {
    try {
      await statusM.mutateAsync({
        managerId: row._id,
        payload: { isActive: row.isActive === false },
      });
      toast(`Manager ${row.isActive === false ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast(`Failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const result = await deleteM.mutateAsync({ managerId: deleteTarget._id });
      const freed = result?.data?.unassignedVehicles ?? 0;
      toast(
        freed > 0
          ? `Manager deleted. ${freed} vehicle${freed === 1 ? '' : 'es'} unassigned.`
          : 'Manager deleted'
      );
      setDeleteTarget(null);
    } catch (err) {
      toast(`Failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const columns = useMemo(() => [
    {
      id: 'name',
      header: 'Manager',
      accessorKey: 'name',
      cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
    },
    {
      id: 'email',
      header: 'Email',
      accessorKey: 'email',
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'isActive',
      cell: (info) => (
        <StatusBadge status={info.getValue() !== false ? 'active' : 'suspended'} />
      ),
    },
    {
      id: 'actions',
      header: '',
      accessorKey: '_id',
      enableSorting: false,
      cell: (info) => {
        const row = info.row.original;
        const toggling = statusM.isPending && statusM.variables?.managerId === row._id;
        // Deleting is irreversible, so it only unlocks once the manager has been
        // deactivated — the reversible step always comes first.
        const isInactive = row.isActive === false;
        return (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => navigate(`/operations?managerId=${row._id}`)}>
              View
            </Button>
            <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={toggling}
              onClick={() => handleToggleStatus(row)}
            >
              {isInactive ? 'Activate' : 'Deactivate'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!isInactive || deleteM.isPending}
              title={isInactive ? undefined : 'Deactivate this manager before deleting'}
              onClick={() => setDeleteTarget(row)}
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ], [statusM.isPending, statusM.variables, deleteM.isPending]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Managers"
        description="Maintain manager accounts, update access status, and rotate credentials securely."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Manager
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Managers" value={stats.total} icon={Users} isLoading={managersQ.isLoading} />
        <StatCard label="Active Managers" value={stats.active} icon={UserCheck} isLoading={managersQ.isLoading} />
        <StatCard label="Inactive Managers" value={stats.inactive} icon={UserX} isLoading={managersQ.isLoading} />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={managersQ.isLoading}
        error={managersQ.error}
        onRetry={managersQ.refetch}
        emptyTitle="No managers yet"
        emptyDescription="Add the first manager to get started."
        totalCount={rows.length}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open && !deleteM.isPending) setDeleteTarget(null); }}
        title={`Delete ${deleteTarget?.name || 'this manager'}?`}
        description="This permanently deletes the manager account and cannot be undone. Any vehicles they own are unassigned and stay in the fleet."
        confirmLabel="Delete Manager"
        destructive
        pending={deleteM.isPending}
        onConfirm={handleConfirmDelete}
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!submitting) setDialogOpen(open); }}
        title={editTarget ? 'Update Manager' : 'Add Manager'}
        submitLabel={editTarget ? 'Update Manager' : 'Create Manager'}
        onSubmit={handleSave}
        pending={submitting}
        error={serverError}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mgr-name">Manager Name</Label>
            <Input
              id="mgr-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Enter full name"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mgr-email">Email</Label>
            <Input
              id="mgr-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="manager@company.com"
              autoComplete="off"
            />
          </div>
          {editTarget ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="mgr-password">New Password</Label>
                <PasswordInput
                  id="mgr-password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Leave blank to keep the current password"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mgr-confirm-password">Confirm New Password</Label>
                <PasswordInput
                  id="mgr-confirm-password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Re-enter the new password"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={resetPwM.isPending || !form.password}
                  onClick={handleSetPassword}
                >
                  {resetPwM.isPending ? 'Updating…' : 'Update password'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="mgr-password">Password</Label>
                <PasswordInput
                  id="mgr-password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Set the manager's password"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mgr-confirm-password">Confirm Password</Label>
                <PasswordInput
                  id="mgr-confirm-password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Re-enter the password"
                  autoComplete="new-password"
                />
                <p className="text-sm text-muted-foreground">
                  At least 8 characters with an uppercase and lowercase letter, a number,
                  and a special character. Share it with the manager directly.
                </p>
              </div>
            </>
          )}
        </div>
      </FormDialog>
    </div>
  );
}
