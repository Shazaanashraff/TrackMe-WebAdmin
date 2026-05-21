import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { adminApi } from '../api';

const createInitialForm = () => ({
  routeId: '',
  routeName: '',
  source: '',
  destination: '',
  distance: 1,
  fare: 1,
  serviceType: 'PUBLIC',
  stops: []
});

export function RoutesPage({ refreshSignal }) {
  const [routes, setRoutes] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [routeForm, setRouteForm] = useState(() => createInitialForm());

  const loadRoutes = useCallback(async () => {
    setRouteLoading(true);
    setRouteError('');
    try {
      const response = await adminApi.getSystemRoutes();
      setRoutes(response.data || []);
    } catch (err) {
      setRouteError(err.message || 'Failed to load routes');
    } finally {
      setRouteLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes, refreshSignal]);

  const addStop = () => {
    setRouteForm((prev) => ({
      ...prev,
      stops: [...prev.stops, { stopName: '', lat: '', lng: '' }]
    }));
  };

  const updateStop = (index, key, value) => {
    setRouteForm((prev) => ({
      ...prev,
      stops: prev.stops.map((stop, stopIndex) => (stopIndex === index ? { ...stop, [key]: value } : stop))
    }));
  };

  const removeStop = (index) => {
    setRouteForm((prev) => ({
      ...prev,
      stops: prev.stops.filter((_, stopIndex) => stopIndex !== index)
    }));
  };

  const moveStop = (index, direction) => {
    setRouteForm((prev) => {
      const nextStops = [...prev.stops];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= nextStops.length) {
        return prev;
      }

      [nextStops[index], nextStops[swapIndex]] = [nextStops[swapIndex], nextStops[index]];
      return { ...prev, stops: nextStops };
    });
  };

  const handleCreateRoute = async (event) => {
    event.preventDefault();
    setRouteError('');

    const rawStops = routeForm.stops.filter(
      (stop) => stop.stopName.trim() || String(stop.lat).trim() || String(stop.lng).trim()
    );

    const hasInvalidStop = rawStops.some(
      (stop) => !stop.stopName.trim() || String(stop.lat).trim() === '' || String(stop.lng).trim() === ''
    );

    if (hasInvalidStop) {
      setRouteError('Each stop must have a name, latitude, and longitude.');
      return;
    }

    const normalizedStops = rawStops.map((stop, index) => ({
      stopName: stop.stopName.trim(),
      order: index + 1,
      lat: Number(stop.lat),
      lng: Number(stop.lng)
    }));

    const hasInvalidCoordinates = normalizedStops.some(
      (stop) => Number.isNaN(stop.lat) || Number.isNaN(stop.lng)
    );

    if (hasInvalidCoordinates) {
      setRouteError('Stop coordinates must be valid numbers.');
      return;
    }

    try {
      await adminApi.createSystemRoute({
        routeId: routeForm.routeId,
        routeName: routeForm.routeName,
        source: routeForm.source,
        destination: routeForm.destination,
        distance: Number(routeForm.distance),
        fare: Number(routeForm.fare),
        serviceType: routeForm.serviceType,
        stops: normalizedStops,
        stopsCount: normalizedStops.length
      });
      setRouteForm(createInitialForm());
      await loadRoutes();
    } catch (err) {
      setRouteError(err.message || 'Failed to create route');
    }
  };

  const routeColumns = [
    { field: 'routeId', headerName: 'Route ID', width: 130 },
    { field: 'routeName', headerName: 'Route Name', flex: 1, minWidth: 220 },
    { field: 'source', headerName: 'Source', width: 140 },
    { field: 'destination', headerName: 'Destination', width: 140 },
    { field: 'serviceType', headerName: 'Service Type', width: 130 },
    { field: 'stopsCount', headerName: 'Stops', width: 90 },
    { field: 'isActive', headerName: 'Status', width: 100, valueGetter: (_value, row) => (row.isActive ? 'Active' : 'Inactive') }
  ];

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={1}>Route Management</Typography>
            <Typography variant="body2" color="text.secondary" mb={2} sx={{ fontFamily: 'Uber Move' }}>
              Create normal and shuttle routes. Stops are optional and can be added, reordered, or removed before saving.
            </Typography>
            {routeError ? <Alert severity="error" sx={{ mb: 1.5 }}>{routeError}</Alert> : null}

            <Box component="form" onSubmit={handleCreateRoute} sx={{ display: 'grid', gap: 2, mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField size="small" fullWidth label="Route ID" value={routeForm.routeId} onChange={(e) => setRouteForm((p) => ({ ...p, routeId: e.target.value }))} required />
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField size="small" fullWidth label="Route Name" value={routeForm.routeName} onChange={(e) => setRouteForm((p) => ({ ...p, routeName: e.target.value }))} required />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField select size="small" fullWidth label="Service Type" value={routeForm.serviceType} onChange={(e) => setRouteForm((p) => ({ ...p, serviceType: e.target.value }))}>
                    <MenuItem value="PUBLIC">PUBLIC</MenuItem>
                    <MenuItem value="SCHOOL">SCHOOL</MenuItem>
                    <MenuItem value="UNIVERSITY">UNIVERSITY</MenuItem>
                    <MenuItem value="OFFICE">OFFICE</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField size="small" fullWidth label="Source" value={routeForm.source} onChange={(e) => setRouteForm((p) => ({ ...p, source: e.target.value }))} required />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField size="small" fullWidth label="Destination" value={routeForm.destination} onChange={(e) => setRouteForm((p) => ({ ...p, destination: e.target.value }))} required />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField size="small" type="number" fullWidth label="Distance" value={routeForm.distance} onChange={(e) => setRouteForm((p) => ({ ...p, distance: e.target.value }))} required />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField size="small" type="number" fullWidth label="Fare (LKR)" value={routeForm.fare} onChange={(e) => setRouteForm((p) => ({ ...p, fare: e.target.value }))} required />
                </Grid>
              </Grid>

              <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 3, p: 2.5, backgroundColor: '#fcfcfd' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">Stops (Optional)</Typography>
                  <Button type="button" size="small" variant="outlined" onClick={addStop}>Add Stop</Button>
                </Stack>

                {routeForm.stops.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No stops added.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {routeForm.stops.map((stop, index) => (
                      <Grid container spacing={1} key={`stop-${index}`} alignItems="center">
                        <Grid item xs={12} md={4}>
                          <TextField
                            size="small"
                            fullWidth
                            label={`Stop ${index + 1} Name`}
                            value={stop.stopName}
                            onChange={(e) => updateStop(index, 'stopName', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            size="small"
                            fullWidth
                            label="Latitude"
                            type="number"
                            value={stop.lat}
                            onChange={(e) => updateStop(index, 'lat', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            size="small"
                            fullWidth
                            label="Longitude"
                            type="number"
                            value={stop.lng}
                            onChange={(e) => updateStop(index, 'lng', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Button type="button" size="small" variant="outlined" onClick={() => moveStop(index, 'up')} disabled={index === 0}>Up</Button>
                            <Button type="button" size="small" variant="outlined" onClick={() => moveStop(index, 'down')} disabled={index === routeForm.stops.length - 1}>Down</Button>
                            <Button type="button" size="small" color="error" variant="outlined" onClick={() => removeStop(index)}>Remove</Button>
                          </Stack>
                        </Grid>
                      </Grid>
                    ))}
                  </Stack>
                )}
              </Box>

              <Button type="submit" variant="contained" sx={{ width: 'fit-content' }}>Create Route</Button>
            </Box>

            <DataGrid
              rows={routes}
              getRowId={(row) => row._id}
              columns={routeColumns}
              loading={routeLoading}
              autoHeight
              hideFooter
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
