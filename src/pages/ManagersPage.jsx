import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

function validate(form) {
  const errors = [];
  if (!form.name.trim()) errors.push('Name is required.');
  if (!form.email.trim()) {
    errors.push('Email is required.');
  } else if (!emailRegex.test(form.email)) {
    errors.push('Enter a valid email address.');
  }
  return errors;
}

const EMPTY_FORM = { name: '', email: '' };

export function ManagersPage() {
  const navigate = useNavigate();
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

  const submitting = createM.isPending || updateM.isPending;

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setServerError(null);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditTarget(row);
    setForm({ name: row.name, email: row.email });
    setServerError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setServerError(null);
    const errs = validate(form);
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
        // The super admin never sets a manager's password directly — the backend
        // always emails an activation link the manager uses to set their own
        // (see accountSetup on the Manager model). `emailSent` tells us whether
        // that actually went out.
        const result = await createM.mutateAsync({ name: form.name, email: form.email });
        toast(result?.message || 'Manager invited');
      }
      setDialogOpen(false);
    } catch (err) {
      setServerError(err);
    }
  };

  const handleSendResetEmail = async () => {
    if (!editTarget) return;
    try {
      const result = await resetPwM.mutateAsync({ managerId: editTarget._id, payload: {} });
      toast(result?.message || 'Reset link emailed to the manager');
    } catch (err) {
      toast(`Failed: ${err?.message || 'Unknown error'}`);
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
          {editTarget ? (
            <div className="space-y-1.5">
              <Label>Password</Label>
              <p className="text-sm text-muted-foreground">
                Managers set their own password via an emailed link — the super admin
                never sets it directly.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={resetPwM.isPending}
                onClick={handleSendResetEmail}
              >
                {resetPwM.isPending ? 'Sending…' : 'Send password reset email'}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              An activation link will be emailed to this address so the manager can set
              their own password.
            </p>
          )}
        </div>
      </FormDialog>
    </div>
  );
}
