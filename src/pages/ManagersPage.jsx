import { useMemo, useState } from 'react';
import { Plus, Users, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { FormDialog } from '@/components/shared/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useManagers,
  useCreateManager,
  useUpdateManager,
  useUpdateManagerStatus,
  useResetManagerPassword,
} from '@/hooks/use-managers';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form, isEdit) {
  const errors = [];
  if (!form.name.trim()) errors.push('Name is required.');
  if (!form.email.trim()) {
    errors.push('Email is required.');
  } else if (!emailRegex.test(form.email)) {
    errors.push('Enter a valid email address.');
  }
  if (!isEdit && !form.password.trim()) errors.push('Password is required for a new manager.');
  if (form.password && form.password.length < 8) errors.push('Password must be at least 8 characters.');
  return errors;
}

const EMPTY_FORM = { name: '', email: '', password: '' };

export function ManagersPage() {
  const managersQ = useManagers();
  const createM = useCreateManager();
  const updateM = useUpdateManager();
  const resetPwM = useResetManagerPassword();
  const statusM = useUpdateManagerStatus();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [serverError, setServerError] = useState(null);

  const rows = managersQ.data?.data || [];

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.isActive !== false).length;
    return { total, active, inactive: total - active };
  }, [rows]);

  const submitting = createM.isPending || updateM.isPending || resetPwM.isPending;

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setServerError(null);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditTarget(row);
    setForm({ name: row.name, email: row.email, password: '' });
    setServerError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setServerError(null);
    const errs = validate(form, Boolean(editTarget));
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
        if (form.password) {
          await resetPwM.mutateAsync({
            managerId: editTarget._id,
            payload: { password: form.password },
          });
        }
        toast('Manager updated successfully');
      } else {
        await createM.mutateAsync({
          name: form.name,
          email: form.email,
          password: form.password,
        });
        toast('Manager created successfully');
      }
      setDialogOpen(false);
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
        return (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={toggling}
              onClick={() => handleToggleStatus(row)}
            >
              {row.isActive === false ? 'Activate' : 'Deactivate'}
            </Button>
          </div>
        );
      },
    },
  ], [statusM.isPending, statusM.variables]);

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
          <div className="space-y-1.5">
            <Label htmlFor="mgr-pw">
              Password
              {editTarget && <span className="text-muted-foreground font-normal ml-1">(optional reset)</span>}
            </Label>
            <Input
              id="mgr-pw"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
