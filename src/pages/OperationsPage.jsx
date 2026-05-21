import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Card, CardContent, Chip, Skeleton, Stack, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, MenuItem, ToggleButton, ToggleButtonGroup, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Edit as EditIcon } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { adminApi } from '../api';

export function OperationsPage({ refreshSignal }) {
  const [overview, setOverview] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [managerDetail, setManagerDetail] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestFilters, setRequestFilters] = useState({ status: 'PENDING', type: 'ALL', managerId: '' });
  const [auditFilters, setAuditFilters] = useState({ managerId: '', action: '', startDate: '', endDate: '' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [editFormData, setEditFormData] = useState({ serviceType: '', bookingEnabled: null });
  const [updating, setUpdating] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState('');
  const [requestPreview, setRequestPreview] = useState(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.getOperationsOverview();
      const rows = response.data || [];
      setOverview(rows);
      if (rows.length > 0 && !selectedManagerId) {
        setSelectedManagerId(rows[0].managerId);
      }
    } catch (err) {
      setError(err.message || 'Failed to load operations overview');
    } finally {
      setLoading(false);
    }
  }, [selectedManagerId]);

  const loadDetail = useCallback(async (managerId) => {
    if (!managerId) return;
    setDetailLoading(true);
    setError('');
    try {
      const response = await adminApi.getOperationManagerDetail(managerId);
      setManagerDetail(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load manager operations details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadPendingRequests = useCallback(async () => {
    setRequestsLoading(true);
    setError('');
    try {
      const response = await adminApi.getPendingBusRequests(requestFilters);
      setPendingRequests(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load pending requests');
    } finally {
      setRequestsLoading(false);
    }
  }, [requestFilters]);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    setError('');
    try {
      const response = await adminApi.getAuditLogs({
        limit: 60,
        ...auditFilters
      });
      setAuditLogs(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setAuditLoading(false);
    }
  }, [auditFilters]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview, refreshSignal]);

  useEffect(() => {
    loadPendingRequests();
    loadAuditLogs();
  }, [loadPendingRequests, loadAuditLogs, refreshSignal]);

  useEffect(() => {
    loadDetail(selectedManagerId);
  }, [loadDetail, selectedManagerId]);

  const handleEditBus = (bus) => {
    setEditingBus(bus);
    setEditFormData({
      serviceType: bus.serviceType || 'PUBLIC',
      bookingEnabled: bus.bookingEnabled !== false
    });
    setEditDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!editingBus) return;
    setUpdating(true);
    setError('');
    try {
      await adminApi.updateBus(editingBus.busId, editFormData);
      setEditDialogOpen(false);
      setEditingBus(null);
      // Reload manager detail to reflect changes
      await loadDetail(selectedManagerId);
    } catch (err) {
      setError(err.message || 'Failed to update bus');
    } finally {
      setUpdating(false);
    }
  };

  const handleReviewRequest = async (requestId, decision) => {
    const note = window.prompt(`Optional note for ${decision.toLowerCase()} action:`) || '';
    setReviewingRequestId(requestId);
    setError('');
    try {
      await adminApi.reviewBusRequest(requestId, {
        decision,
        note
      });
      await Promise.all([loadPendingRequests(), loadAuditLogs(), loadOverview()]);
      if (selectedManagerId) {
        await loadDetail(selectedManagerId);
      }
    } catch (err) {
      setError(err.message || `Failed to ${decision.toLowerCase()} request`);
    } finally {
      setReviewingRequestId('');
    }
  };

  const columns = [
    { field: 'managerName', headerName: 'Manager', flex: 1, minWidth: 170 },
    { field: 'managerEmail', headerName: 'Email', flex: 1.2, minWidth: 220 },
    { field: 'fleetCount', headerName: 'Buses', width: 90, valueGetter: (_value, row) => row.fleet?.totalBuses || 0 },
    { field: 'bookingsCount', headerName: 'Bookings', width: 110, valueGetter: (_value, row) => row.bookings?.totalBookings || 0 },
    {
      field: 'rating',
      headerName: 'Avg Rating',
      width: 120,
      valueGetter: (_value, row) => row.reviews?.averageRating || 0
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip label={params.row.isActive ? 'Active' : 'Inactive'} color={params.row.isActive ? 'success' : 'warning'} size="small" />
      )
    }
  ];

  const detailCards = useMemo(() => {
    if (!managerDetail?.manager) return [];
    return [
      { label: 'Total Buses', value: managerDetail.buses?.length || 0 },
      {
        label: 'Active Buses',
        value: (managerDetail.buses || []).filter((bus) => bus.isActive).length
      },
      {
        label: 'Bookings',
        value: (managerDetail.buses || []).reduce((sum, bus) => sum + (bus.bookingMetrics?.totalBookings || 0), 0)
      },
      {
        label: 'Revenue',
        value: `₹${(managerDetail.buses || []).reduce((sum, bus) => sum + (bus.bookingMetrics?.totalRevenue || 0), 0).toLocaleString()}`
      }
    ];
  }, [managerDetail]);

  const summaryCards = useMemo(() => {
    const totalManagers = overview.length;
    const activeManagers = overview.filter((item) => item.isActive).length;
    const pendingCount = pendingRequests.filter((item) => item.status === 'PENDING').length;
    const auditCount = auditLogs.length;
    return [
      { label: 'Managers', value: totalManagers },
      { label: 'Active Managers', value: activeManagers },
      { label: 'Pending Requests', value: pendingCount },
      { label: 'Audit Records', value: auditCount },
    ];
  }, [overview, pendingRequests, auditLogs]);

  const requestColumns = useMemo(() => [
    { field: 'type', headerName: 'Type', width: 180 },
    {
      field: 'manager',
      headerName: 'Manager',
      flex: 1,
      minWidth: 180,
      valueGetter: (_value, row) => row.managerId?.name || 'Unknown'
    },
    { field: 'busId', headerName: 'Bus ID', width: 120 },
    {
      field: 'createdAt',
      headerName: 'Submitted',
      width: 190,
      valueGetter: (_value, row) => new Date(row.createdAt).toLocaleString()
    },
    {
      field: 'reason',
      headerName: 'Reason',
      flex: 1,
      minWidth: 180,
      valueGetter: (_value, row) => row.reason || '-'
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 300,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const busy = reviewingRequestId === params.row._id;
        return (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="text" onClick={() => setRequestPreview(params.row)}>
              View
            </Button>
            <Button size="small" color="success" variant="outlined" disabled={busy} onClick={() => handleReviewRequest(params.row._id, 'APPROVE')}>
              Approve
            </Button>
            <Button size="small" color="error" variant="outlined" disabled={busy} onClick={() => handleReviewRequest(params.row._id, 'REJECT')}>
              Reject
            </Button>
          </Stack>
        );
      }
    }
  ], [reviewingRequestId]);

  const managerFilterOptions = useMemo(() => {
    return overview.map((item) => ({
      managerId: item.managerId,
      managerName: item.managerName
    }));
  }, [overview]);

  const auditColumns = useMemo(() => [
    {
      field: 'createdAt',
      headerName: 'Time',
      width: 190,
      valueGetter: (_value, row) => new Date(row.createdAt).toLocaleString()
    },
    {
      field: 'manager',
      headerName: 'Manager',
      minWidth: 170,
      flex: 1,
      valueGetter: (_value, row) => row.managerId?.name || 'Unknown'
    },
    { field: 'action', headerName: 'Action', width: 220 },
    { field: 'entityType', headerName: 'Entity', width: 130 },
    { field: 'entityId', headerName: 'Entity ID', width: 160 },
    {
      field: 'actor',
      headerName: 'Actor',
      minWidth: 170,
      flex: 1,
      valueGetter: (_value, row) => row.actorId?.email || '-'
    }
  ], []);

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'grid', gap: 0.8 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#344767' }}>
          Operations
        </Typography>
        <Typography variant="body2" sx={{ color: '#67748e' }}>
          Supervise manager performance, review requests, and track operation-level audit activity.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        {summaryCards.map((card) => (
          <Grid key={card.label} size={{ xs: 6, md: 3 }}>
            <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.2)' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" sx={{ color: '#67748e', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                  {card.label}
                </Typography>
                <Typography variant="h6" sx={{ color: '#344767', fontWeight: 800, mt: 0.8 }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 5 }}>
        <Card sx={{ backgroundColor: 'background.paper', border: '1px solid rgba(100, 116, 139, 0.25)' }}>
          <CardContent>
            <Typography variant="h6" mb={2}>Operations Managers</Typography>
            <DataGrid
              rows={overview}
              columns={columns}
              getRowId={(row) => row.managerId}
              loading={loading}
              autoHeight
              hideFooter
              onRowClick={(params) => setSelectedManagerId(params.row.managerId)}
              getRowClassName={(params) =>
                params.row.managerId === selectedManagerId ? 'operations-selected-row' : ''
              }
              sx={{
                '& .operations-selected-row': {
                  backgroundColor: 'rgba(59, 130, 246, 0.08)'
                }
              }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <Card sx={{ backgroundColor: 'background.paper', border: '1px solid rgba(100, 116, 139, 0.25)' }}>
          <CardContent>
            <Typography variant="h6" mb={0.5}>Manager Operations Detail</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Buses, booking performance, and review intelligence in one panel.</Typography>

            {detailLoading ? <Skeleton variant="rounded" height={180} /> : null}

            {!detailLoading && managerDetail?.manager ? (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>{managerDetail.manager.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{managerDetail.manager.email}</Typography>
                </Box>

                <Grid container spacing={1.5}>
                  {detailCards.map((card) => (
                    <Grid size={{ xs: 6, md: 3 }} key={card.label}>
                      <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(100, 116, 139, 0.25)', backgroundColor: '#0f172a' }}>
                        <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                        <Typography variant="h6" fontWeight={700}>{card.value}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                <Typography variant="subtitle2">Managed Buses</Typography>
                <DataGrid
                  rows={managerDetail.buses || []}
                  getRowId={(row) => row._id}
                  autoHeight
                  hideFooter
                  columns={[
                    { field: 'busName', headerName: 'Bus', flex: 1, minWidth: 150 },
                    { field: 'routeId', headerName: 'Route', width: 120 },
                    {
                      field: 'serviceType',
                      headerName: 'Service Type',
                      width: 130,
                      renderCell: (params) => {
                        const serviceTypeColors = { PUBLIC: 'primary', SCHOOL: 'info', UNIVERSITY: 'success', OFFICE: 'warning' };
                        return (
                          <Chip 
                            size="small" 
                            label={params.row.serviceType || 'PUBLIC'} 
                            color={serviceTypeColors[params.row.serviceType] || 'default'}
                          />
                        );
                      }
                    },
                    {
                      field: 'bookingEnabled',
                      headerName: 'Bookings',
                      width: 110,
                      renderCell: (params) => (
                        <Chip 
                          size="small" 
                          label={params.row.bookingEnabled !== false ? 'Enabled' : 'Disabled'} 
                          color={params.row.bookingEnabled !== false ? 'success' : 'error'}
                        />
                      )
                    },
                    {
                      field: 'active',
                      headerName: 'State',
                      width: 100,
                      renderCell: (params) => (
                        <Chip size="small" label={params.row.isActive ? 'Active' : 'Inactive'} color={params.row.isActive ? 'success' : 'warning'} />
                      )
                    },
                    {
                      field: 'rating',
                      headerName: 'Rating',
                      width: 90,
                      valueGetter: (_value, row) => row.reviewMetrics?.averageRating || 0
                    },
                    {
                      field: 'reviews',
                      headerName: 'Reviews',
                      width: 90,
                      valueGetter: (_value, row) => row.reviewMetrics?.reviewCount || 0
                    },
                    {
                      field: 'bookings',
                      headerName: 'Bookings',
                      width: 90,
                      valueGetter: (_value, row) => row.bookingMetrics?.totalBookings || 0
                    },
                    {
                      field: 'revenue',
                      headerName: 'Revenue',
                      width: 120,
                      valueGetter: (_value, row) => `₹${Number(row.bookingMetrics?.totalRevenue || 0).toLocaleString()}`
                    },
                    {
                      field: 'actions',
                      headerName: 'Edit',
                      width: 70,
                      sortable: false,
                      filterable: false,
                      renderCell: (params) => (
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditBus(params.row)}
                          title="Edit bus settings"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )
                    }
                  ]}
                />
              </Stack>
            ) : null}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card sx={{ backgroundColor: 'background.paper', border: '1px solid rgba(100, 116, 139, 0.25)' }}>
          <CardContent>
            <Typography variant="h6" mb={0.5}>Pending Approval Requests</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Manager add/delete bus actions require superAdmin decision.</Typography>
            <Grid container spacing={1.2} sx={{ mb: 1.5 }}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Status"
                  value={requestFilters.status}
                  onChange={(e) => setRequestFilters((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <MenuItem value="PENDING">PENDING</MenuItem>
                  <MenuItem value="APPROVED">APPROVED</MenuItem>
                  <MenuItem value="REJECTED">REJECTED</MenuItem>
                  <MenuItem value="ALL">ALL</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Request Type"
                  value={requestFilters.type}
                  onChange={(e) => setRequestFilters((prev) => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="ALL">ALL</MenuItem>
                  <MenuItem value="CREATE_BUS_ACCOUNT">CREATE_BUS_ACCOUNT</MenuItem>
                  <MenuItem value="DELETE_BUS">DELETE_BUS</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Manager"
                  value={requestFilters.managerId}
                  onChange={(e) => setRequestFilters((prev) => ({ ...prev, managerId: e.target.value }))}
                >
                  <MenuItem value="">All Managers</MenuItem>
                  {managerFilterOptions.map((option) => (
                    <MenuItem key={option.managerId} value={option.managerId}>{option.managerName}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Button fullWidth variant="outlined" onClick={() => loadPendingRequests()}>Apply</Button>
              </Grid>
            </Grid>
            <DataGrid
              rows={pendingRequests}
              getRowId={(row) => row._id}
              columns={requestColumns}
              loading={requestsLoading}
              autoHeight
              hideFooter
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card sx={{ backgroundColor: 'background.paper', border: '1px solid rgba(100, 116, 139, 0.25)' }}>
          <CardContent>
            <Typography variant="h6" mb={0.5}>Audit Ledger</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Recent manager and approval lifecycle events.</Typography>
            <Grid container spacing={1.2} sx={{ mb: 1.5 }}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Manager"
                  value={auditFilters.managerId}
                  onChange={(e) => setAuditFilters((prev) => ({ ...prev, managerId: e.target.value }))}
                >
                  <MenuItem value="">All Managers</MenuItem>
                  {managerFilterOptions.map((option) => (
                    <MenuItem key={option.managerId} value={option.managerId}>{option.managerName}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Action"
                  value={auditFilters.action}
                  onChange={(e) => setAuditFilters((prev) => ({ ...prev, action: e.target.value }))}
                  placeholder="BUS_REQUEST_APPROVED"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="From"
                  InputLabelProps={{ shrink: true }}
                  value={auditFilters.startDate}
                  onChange={(e) => setAuditFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="To"
                  InputLabelProps={{ shrink: true }}
                  value={auditFilters.endDate}
                  onChange={(e) => setAuditFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Button fullWidth variant="outlined" onClick={() => loadAuditLogs()}>Apply</Button>
              </Grid>
            </Grid>
            <DataGrid
              rows={auditLogs}
              getRowId={(row) => row._id}
              columns={auditColumns}
              loading={auditLoading}
              autoHeight
              hideFooter
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Edit Bus Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Bus Settings</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" mb={1}>Service Type</Typography>
              <ToggleButtonGroup
                value={editFormData.serviceType}
                onChange={(e, newType) => {
                  if (newType) setEditFormData({ ...editFormData, serviceType: newType });
                }}
                exclusive
                fullWidth
                size="small"
              >
                <ToggleButton value="PUBLIC">Public</ToggleButton>
                <ToggleButton value="SCHOOL">School</ToggleButton>
                <ToggleButton value="UNIVERSITY">University</ToggleButton>
                <ToggleButton value="OFFICE">Office</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" mb={1}>Booking Status</Typography>
              <ToggleButtonGroup
                value={editFormData.bookingEnabled ? 'enabled' : 'disabled'}
                onChange={(e, newStatus) => {
                  if (newStatus) setEditFormData({ ...editFormData, bookingEnabled: newStatus === 'enabled' });
                }}
                exclusive
                fullWidth
                size="small"
              >
                <ToggleButton value="enabled">Enabled</ToggleButton>
                <ToggleButton value="disabled">Disabled</ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Drivers can toggle booking availability on/off. Disabled prevents new reservations.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveChanges} variant="contained" disabled={updating}>
            {updating ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(requestPreview)} onClose={() => setRequestPreview(null)} fullWidth maxWidth="md">
        <DialogTitle>Request Details</DialogTitle>
        <DialogContent>
          {requestPreview ? (
            <Stack spacing={1.2}>
              <Typography variant="body2"><strong>Type:</strong> {requestPreview.type}</Typography>
              <Typography variant="body2"><strong>Status:</strong> {requestPreview.status}</Typography>
              <Typography variant="body2"><strong>Manager:</strong> {requestPreview.managerId?.name || '-'} ({requestPreview.managerId?.email || '-'})</Typography>
              <Typography variant="body2"><strong>Bus ID:</strong> {requestPreview.busId}</Typography>
              <Typography variant="body2"><strong>Reason:</strong> {requestPreview.reason || '-'}</Typography>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>Payload</Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid rgba(100, 116, 139, 0.25)',
                  backgroundColor: '#0b1220',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {JSON.stringify(requestPreview.payload || {}, null, 2)}
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestPreview(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Grid>
    </Box>
  );
}

