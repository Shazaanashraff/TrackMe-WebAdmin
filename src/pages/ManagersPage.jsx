import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { DataGrid } from '@mui/x-data-grid';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { adminApi } from '../api';

const defaultForm = { managerId: null, name: '', email: '', password: '' };

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ManagersPage({ refreshSignal }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(defaultForm);
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  const loadManagers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.getManagers();
      setRows(response.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load managers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagers();
  }, [refreshSignal]);

  const validation = useMemo(() => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(form.email)) {
      errors.email = 'Enter a valid email address';
    }
    if (!form.managerId && !form.password.trim()) {
      errors.password = 'Password is required for new manager';
    }
    if (form.password && form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    return errors;
  }, [form]);

  const onField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const resetForm = () => {
    setForm(defaultForm);
  };

  const openCreateDialog = () => {
    setForm(defaultForm);
    setFormDialogOpen(true);
  };

  const openEditDialog = (row) => {
    setForm({ managerId: row._id, name: row.name, email: row.email, password: '' });
    setFormDialogOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (Object.keys(validation).length > 0) {
      setError('Please correct highlighted validation errors before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      if (form.managerId) {
        await adminApi.updateManager(form.managerId, { name: form.name, email: form.email });
        if (form.password) {
          await adminApi.resetManagerPassword(form.managerId, { password: form.password });
        }
        setSuccess('Manager updated successfully');
      } else {
        await adminApi.createManager({ name: form.name, email: form.email, password: form.password });
        setSuccess('Manager created successfully');
      }
      resetForm();
      setFormDialogOpen(false);
      await loadManagers();
    } catch (err) {
      setError(err.message || 'Failed to save manager');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (row) => {
    setError('');
    setSuccess('');
    try {
      await adminApi.updateManagerStatus(row._id, { isActive: !(row.isActive !== false) });
      setSuccess('Manager status updated');
      await loadManagers();
    } catch (err) {
      setError(err.message || 'Failed to update manager status');
    }
  };

  const columns = [
    { field: 'name', headerName: 'Manager', flex: 1, minWidth: 180 },
    { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 220 },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => (
        <Chip
          label={params.row.isActive !== false ? 'Active' : 'Inactive'}
          color={params.row.isActive !== false ? 'success' : 'warning'}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 280,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} sx={{ py: 1 }}>
          <Button size="sm" variant="outline" onClick={() => openEditDialog(params.row)}>
            Edit
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleToggleStatus(params.row)}>
            {params.row.isActive !== false ? 'Deactivate' : 'Activate'}
          </Button>
        </Stack>
      )
    }
  ];

  const summary = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((row) => row.isActive !== false).length;
    const inactive = total - active;
    const editing = form.managerId ? 1 : 0;
    return { total, active, inactive, editing };
  }, [rows, form.managerId]);

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'grid', gap: 0.8 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#344767' }}>
          Managers
        </Typography>
        <Typography variant="body2" sx={{ color: '#67748e' }}>
          Maintain manager accounts, update access status, and rotate credentials securely.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {[
          { label: 'Total Managers', value: summary.total },
          { label: 'Active', value: summary.active },
          { label: 'Inactive', value: summary.inactive },
          { label: 'Editing Mode', value: summary.editing ? 'On' : 'Off' },
        ].map((item) => (
          <Grid key={item.label} size={{ xs: 6, md: 3 }}>
            <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.2)' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" sx={{ color: '#67748e', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                  {item.label}
                </Typography>
                <Typography variant="h6" sx={{ color: '#344767', fontWeight: 800, mt: 0.8 }}>
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.24)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>Managers Directory</Typography>
              <Typography variant="body2" color="text.secondary">
                Primary roster for manager-level users and status control.
              </Typography>
            </Box>
            <Button onClick={openCreateDialog}>Add Manager</Button>
          </Stack>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row._id}
            loading={loading}
            autoHeight
            pageSizeOptions={[5, 10, 20]}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            disableRowSelectionOnClick
            sx={{
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: 2,
              '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(148, 163, 184, 0.08)' },
            }}
          />
        </CardContent>
      </Card>

      <Dialog open={formDialogOpen} onClose={() => !submitting && setFormDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{form.managerId ? 'Update Manager' : 'Add Manager'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <form id="manager-form" onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="text-sm text-slate-600 font-semibold block mb-2">Manager Name</label>
              <Input value={form.name} onChange={onField('name')} placeholder="Enter full name" />
              {validation.name ? <p className="text-xs text-red-400 mt-1">{validation.name}</p> : null}
            </div>

            <div>
              <label className="text-sm text-slate-600 font-semibold block mb-2">Email</label>
              <Input type="email" value={form.email} onChange={onField('email')} placeholder="manager@company.com" />
              {validation.email ? <p className="text-xs text-red-400 mt-1">{validation.email}</p> : null}
            </div>

            <div>
              <label className="text-sm text-slate-600 font-semibold block mb-2">Password {form.managerId ? '(optional reset)' : ''}</label>
              <Input type="password" value={form.password} onChange={onField('password')} placeholder="Minimum 8 characters" />
              {validation.password ? <p className="text-xs text-red-400 mt-1">{validation.password}</p> : null}
            </div>
          </form>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button type="button" variant="outline" onClick={() => { resetForm(); setFormDialogOpen(false); }} disabled={submitting}>Cancel</Button>
          <Button type="submit" form="manager-form" disabled={submitting}>
            {submitting ? <CircularProgress color="inherit" size={16} /> : form.managerId ? 'Update Manager' : 'Create Manager'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
