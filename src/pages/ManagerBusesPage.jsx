import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Step,
  StepLabel,
  Stepper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { DataGrid } from '@mui/x-data-grid';
import { adminApi } from '../api';

const SERVICE_TYPES = ['PUBLIC', 'SCHOOL', 'UNIVERSITY', 'OFFICE'];
const BUS_TYPES = ['AC', 'NON-AC', 'DELUXE', 'SLEEPER'];
const CREATE_STEPS = ['Bus Details', 'Driver & Access', 'Review & Submit'];

const emptyCreateForm = {
  busId: '',
  busName: '',
  numberPlate: '',
  routeId: '',
  seatCapacity: 40,
  busType: 'AC',
  serviceType: 'PUBLIC',
  bookingEnabled: true,
  driverName: '',
  driverEmail: '',
  driverPhoneNumber: '',
  driverNicNumber: '',
  driverLicenseCardNumber: '',
  password: '',
  reason: ''
};

export function ManagerBusesPage({ refreshSignal }) {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeCreateStep, setActiveCreateStep] = useState(0);
  const [createFormError, setCreateFormError] = useState('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editBus, setEditBus] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const loadBuses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.getManagerBuses();
      setBuses(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load buses');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRoutes = useCallback(async () => {
    try {
      const response = await adminApi.getBusRoutes();
      setRoutes(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load available routes');
    }
  }, []);

  useEffect(() => {
    loadBuses();
  }, [loadBuses, refreshSignal]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes, refreshSignal]);

  const handleCreateRequest = async (event) => {
    if (event) event.preventDefault();
    setCreating(true);
    setError('');
    setCreateFormError('');
    try {
      await adminApi.createBusAccountRequest({
        ...createForm,
        seatCapacity: Number(createForm.seatCapacity)
      });
      setCreateForm(emptyCreateForm);
      setActiveCreateStep(0);
      setCreateDialogOpen(false);
      await loadBuses();
    } catch (err) {
      setError(err.message || 'Failed to submit bus account request');
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = (bus) => {
    setEditBus(bus);
    setEditForm({
      busName: bus.busName,
      numberPlate: bus.numberPlate,
      registrationNumber: bus.registrationNumber,
      routeId: bus.routeId,
      seatCapacity: bus.seatCapacity,
      busType: bus.busType,
      serviceType: bus.serviceType,
      bookingEnabled: bus.bookingEnabled,
      isActive: bus.isActive,
      maintenanceStatus: bus.maintenanceStatus
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editBus) return;
    setSavingEdit(true);
    setError('');
    try {
      await adminApi.updateManagerBus(editBus.busId, {
        ...editForm,
        seatCapacity: Number(editForm.seatCapacity)
      });
      setEditDialogOpen(false);
      setEditBus(null);
      await loadBuses();
    } catch (err) {
      setError(err.message || 'Failed to update bus');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteRequest = async (busId) => {
    const reason = window.prompt('Reason for deletion request (optional):') || '';
    setError('');
    try {
      await adminApi.requestDeleteBus(busId, { reason });
      await loadBuses();
    } catch (err) {
      setError(err.message || 'Failed to submit delete request');
    }
  };

  const columns = useMemo(() => [
    { field: 'busId', headerName: 'Bus ID', width: 120 },
    { field: 'busName', headerName: 'Bus Name', flex: 1, minWidth: 160 },
    { field: 'numberPlate', headerName: 'Number Plate', width: 150 },
    { field: 'routeId', headerName: 'Route', width: 120 },
    { field: 'serviceType', headerName: 'Service', width: 120 },
    { field: 'bookingEnabled', headerName: 'Booking', width: 110, valueGetter: (_v, row) => row.bookingEnabled ? 'Enabled' : 'Disabled' },
    { field: 'isActive', headerName: 'State', width: 100, valueGetter: (_v, row) => row.isActive ? 'Active' : 'Inactive' },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 210,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={() => openEditDialog(params.row)}>Edit</Button>
          <Button size="small" color="warning" variant="outlined" onClick={() => handleDeleteRequest(params.row.busId)}>Delete Req</Button>
        </Stack>
      )
    }
  ], []);

  const summary = useMemo(() => {
    const total = buses.length;
    const active = buses.filter((bus) => bus.isActive).length;
    const bookingEnabled = buses.filter((bus) => bus.bookingEnabled).length;
    const inactive = total - active;
    return { total, active, inactive, bookingEnabled };
  }, [buses]);

  const validateCreateStep = (step) => {
    if (step === 0) {
      if (!createForm.busId || !createForm.busName || !createForm.numberPlate || !createForm.routeId) {
        return 'Please complete Bus ID, Bus Name, Number Plate, and Route.';
      }
      if (!Number(createForm.seatCapacity) || Number(createForm.seatCapacity) <= 0) {
        return 'Seat capacity should be a valid positive number.';
      }
    }
    if (step === 1) {
      if (!createForm.password) {
        return 'Initial password is required before submitting the request.';
      }
      if (createForm.driverEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.driverEmail)) {
        return 'Driver email format looks invalid.';
      }
    }
    return '';
  };

  const handleNextStep = () => {
    const validationMessage = validateCreateStep(activeCreateStep);
    if (validationMessage) {
      setCreateFormError(validationMessage);
      return;
    }
    setCreateFormError('');
    setActiveCreateStep((prev) => Math.min(prev + 1, CREATE_STEPS.length - 1));
  };

  const handleBackStep = () => {
    setCreateFormError('');
    setActiveCreateStep((prev) => Math.max(prev - 1, 0));
  };

  const handleOpenCreateDialog = () => {
    setCreateFormError('');
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    if (creating) return;
    setCreateDialogOpen(false);
    setCreateForm(emptyCreateForm);
    setActiveCreateStep(0);
    setCreateFormError('');
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#344767' }}>
          Bus Management
        </Typography>
        <Typography variant="body2" sx={{ color: '#67748e' }}>
          Review managed buses, monitor availability, and submit new bus account requests.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {[
          { label: 'Total Buses', value: summary.total },
          { label: 'Active Fleet', value: summary.active },
          { label: 'Inactive Fleet', value: summary.inactive },
          { label: 'Booking Enabled', value: summary.bookingEnabled },
        ].map((item) => (
          <Grid key={item.label} size={{ xs: 6, md: 3 }}>
            <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.2)' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" sx={{ color: '#67748e', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                  {item.label}
                </Typography>
                <Typography variant="h5" sx={{ color: '#344767', fontWeight: 800, mt: 0.8 }}>
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.24)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Box>
                  <Typography variant="h6" fontWeight={800}>Managed Buses</Typography>
                  <Typography variant="body2" color="text.secondary">Primary fleet registry and current operational status.</Typography>
                </Box>
                <Button variant="contained" onClick={handleOpenCreateDialog}>
                  Add Bus Request
                </Button>
              </Stack>
              <DataGrid
                rows={buses}
                getRowId={(row) => row._id}
                loading={loading}
                columns={columns}
                autoHeight
                hideFooter
                sx={{
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  borderRadius: 2,
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: 'rgba(148, 163, 184, 0.08)',
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} fullWidth maxWidth="md">
        <Box component="form" onSubmit={handleCreateRequest}>
          <DialogTitle>Add Bus Request</DialogTitle>
          <DialogContent dividers sx={{ display: 'grid', gap: 1.5, pt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Complete each step and submit for superAdmin approval.
            </Typography>

            <Stepper activeStep={activeCreateStep} alternativeLabel sx={{ mb: 0.5 }}>
              {CREATE_STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {createFormError ? <Alert severity="warning">{createFormError}</Alert> : null}

            {activeCreateStep === 0 && (
              <Box sx={{ display: 'grid', gap: 1.2 }}>
                <TextField size="small" label="Bus ID" value={createForm.busId} onChange={(e) => setCreateForm((p) => ({ ...p, busId: e.target.value }))} required />
                <TextField size="small" label="Bus Name" value={createForm.busName} onChange={(e) => setCreateForm((p) => ({ ...p, busName: e.target.value }))} required />
                <TextField size="small" label="Number Plate" value={createForm.numberPlate} onChange={(e) => setCreateForm((p) => ({ ...p, numberPlate: e.target.value.toUpperCase() }))} required />
                <TextField
                  select
                  size="small"
                  label="Route"
                  value={createForm.routeId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, routeId: e.target.value }))}
                  required
                  helperText={routes.length === 0 ? 'No active routes found. Create routes first.' : 'Select a valid route ID'}
                >
                  {routes.map((route) => (
                    <MenuItem key={route.routeId} value={route.routeId}>
                      {route.routeName || route.routeId} ({route.routeId})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField size="small" label="Seat Capacity" type="number" value={createForm.seatCapacity} onChange={(e) => setCreateForm((p) => ({ ...p, seatCapacity: e.target.value }))} required />
                <TextField select size="small" label="Bus Type" value={createForm.busType} onChange={(e) => setCreateForm((p) => ({ ...p, busType: e.target.value }))}>
                  {BUS_TYPES.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Service Type" value={createForm.serviceType} onChange={(e) => setCreateForm((p) => ({ ...p, serviceType: e.target.value }))}>
                  {SERVICE_TYPES.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </TextField>
              </Box>
            )}

            {activeCreateStep === 1 && (
              <Box sx={{ display: 'grid', gap: 1.2 }}>
                <TextField size="small" label="Driver Name" value={createForm.driverName} onChange={(e) => setCreateForm((p) => ({ ...p, driverName: e.target.value }))} />
                <TextField size="small" type="email" label="Driver Email" value={createForm.driverEmail} onChange={(e) => setCreateForm((p) => ({ ...p, driverEmail: e.target.value }))} />
                <TextField size="small" label="Driver Phone Number" value={createForm.driverPhoneNumber} onChange={(e) => setCreateForm((p) => ({ ...p, driverPhoneNumber: e.target.value }))} />
                <TextField size="small" label="Driver NIC Number" value={createForm.driverNicNumber} onChange={(e) => setCreateForm((p) => ({ ...p, driverNicNumber: e.target.value }))} />
                <TextField size="small" label="Driver License Card Number" value={createForm.driverLicenseCardNumber} onChange={(e) => setCreateForm((p) => ({ ...p, driverLicenseCardNumber: e.target.value }))} />
                <TextField size="small" type="password" label="Initial Password" value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} required />
                <TextField size="small" label="Reason (optional)" value={createForm.reason} onChange={(e) => setCreateForm((p) => ({ ...p, reason: e.target.value }))} />
              </Box>
            )}

            {activeCreateStep === 2 && (
              <Box sx={{ display: 'grid', gap: 1.1 }}>
                <Typography variant="body2"><strong>Bus:</strong> {createForm.busId} - {createForm.busName}</Typography>
                <Typography variant="body2"><strong>Number Plate:</strong> {createForm.numberPlate}</Typography>
                <Typography variant="body2"><strong>Route:</strong> {createForm.routeId}</Typography>
                <Typography variant="body2"><strong>Capacity:</strong> {createForm.seatCapacity} seats</Typography>
                <Typography variant="body2"><strong>Type:</strong> {createForm.busType} / {createForm.serviceType}</Typography>
                <Typography variant="body2"><strong>Driver:</strong> {createForm.driverName || 'Not provided'}</Typography>
                <Typography variant="body2"><strong>Driver Email:</strong> {createForm.driverEmail || 'Not provided'}</Typography>
                <Typography variant="body2"><strong>Reason:</strong> {createForm.reason || 'Not provided'}</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleCloseCreateDialog} disabled={creating}>Cancel</Button>
            <Button variant="outlined" disabled={activeCreateStep === 0 || creating} onClick={handleBackStep}>
              Back
            </Button>
            {activeCreateStep < CREATE_STEPS.length - 1 ? (
              <Button variant="contained" onClick={handleNextStep}>
                Continue
              </Button>
            ) : (
              <Button type="submit" variant="contained" disabled={creating}>
                {creating ? 'Submitting...' : 'Submit Request'}
              </Button>
            )}
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Bus</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 1.2, pt: 2 }}>
          <TextField size="small" label="Bus Name" value={editForm.busName || ''} onChange={(e) => setEditForm((p) => ({ ...p, busName: e.target.value }))} />
          <TextField size="small" label="Number Plate" value={editForm.numberPlate || ''} onChange={(e) => setEditForm((p) => ({ ...p, numberPlate: e.target.value.toUpperCase() }))} />
          <TextField size="small" label="Route ID" value={editForm.routeId || ''} onChange={(e) => setEditForm((p) => ({ ...p, routeId: e.target.value }))} />
          <TextField size="small" type="number" label="Seat Capacity" value={editForm.seatCapacity || ''} onChange={(e) => setEditForm((p) => ({ ...p, seatCapacity: e.target.value }))} />
          <TextField select size="small" label="Bus Type" value={editForm.busType || 'AC'} onChange={(e) => setEditForm((p) => ({ ...p, busType: e.target.value }))}>
            {BUS_TYPES.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Service Type" value={editForm.serviceType || 'PUBLIC'} onChange={(e) => setEditForm((p) => ({ ...p, serviceType: e.target.value }))}>
            {SERVICE_TYPES.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Booking" value={String(Boolean(editForm.bookingEnabled))} onChange={(e) => setEditForm((p) => ({ ...p, bookingEnabled: e.target.value === 'true' }))}>
            <MenuItem value="true">Enabled</MenuItem>
            <MenuItem value="false">Disabled</MenuItem>
          </TextField>
          <TextField select size="small" label="Status" value={String(Boolean(editForm.isActive))} onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.value === 'true' }))}>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </TextField>
          <TextField select size="small" label="Maintenance" value={editForm.maintenanceStatus || 'ACTIVE'} onChange={(e) => setEditForm((p) => ({ ...p, maintenanceStatus: e.target.value }))}>
            <MenuItem value="ACTIVE">ACTIVE</MenuItem>
            <MenuItem value="MAINTENANCE">MAINTENANCE</MenuItem>
            <MenuItem value="OUT_OF_SERVICE">OUT_OF_SERVICE</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
