import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { adminApi } from '../api';

export function ManagerAccountsPage({ refreshSignal }) {
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadBuses = useCallback(async () => {
    try {
      const response = await adminApi.getManagerBuses();
      const rows = response.data || [];
      setBuses(rows);
      if (rows.length > 0 && !selectedBusId) {
        setSelectedBusId(rows[0].busId);
      }
    } catch (err) {
      setError(err.message || 'Failed to load buses');
    }
  }, [selectedBusId]);

  useEffect(() => {
    loadBuses();
  }, [loadBuses, refreshSignal]);

  const handleReset = async (event) => {
    event.preventDefault();
    if (!selectedBusId) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await adminApi.resetManagerBusAccountPassword(selectedBusId, { password });
      setPassword('');
      setSuccess('Bus account password updated successfully');
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const selectedBus = buses.find((bus) => bus.busId === selectedBusId);

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'grid', gap: 0.8 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#344767' }}>
          Account Management
        </Typography>
        <Typography variant="body2" sx={{ color: '#67748e' }}>
          Rotate bus account credentials securely when driver assignments change.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {[
          { label: 'Managed Buses', value: buses.length },
          { label: 'Selected Bus', value: selectedBusId || 'None' },
          { label: 'Password Policy', value: 'Min 8 chars' },
        ].map((item) => (
          <Grid key={item.label} size={{ xs: 12, sm: 4 }}>
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

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.24)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.6 }}>
                Reset Bus Account Password
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select a bus account and set a new credential for the assigned operator.
              </Typography>

              {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
              {success ? <Alert severity="success" sx={{ mb: 1.5 }}>{success}</Alert> : null}

              <Box component="form" onSubmit={handleReset} sx={{ display: 'grid', gap: 1.5, maxWidth: 520 }}>
                <TextField
                  select
                  label="Bus"
                  size="small"
                  value={selectedBusId}
                  onChange={(e) => setSelectedBusId(e.target.value)}
                  required
                >
                  {buses.map((bus) => (
                    <MenuItem key={bus._id} value={bus.busId}>{bus.busName} ({bus.busId})</MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="New Password"
                  type="password"
                  size="small"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="Use at least 8 characters."
                  required
                />

                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.24)', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#344767', mb: 1 }}>
                Selected Account Context
              </Typography>
              <Box sx={{ display: 'grid', gap: 1.1 }}>
                <Typography variant="body2" sx={{ color: '#344767' }}>
                  <strong>Bus:</strong> {selectedBus?.busName || 'Not selected'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#344767' }}>
                  <strong>Bus ID:</strong> {selectedBusId || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#344767' }}>
                  <strong>Number Plate:</strong> {selectedBus?.numberPlate || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#344767' }}>
                  <strong>Route:</strong> {selectedBus?.routeId || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#344767' }}>
                  <strong>Driver Email:</strong> {selectedBus?.driverId?.email || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#67748e', mt: 1 }}>
                  Tip: update this password immediately when a driver handover happens.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
