import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { adminApi } from '../api';
import { CustomRoutePreviewModal } from '../components/CustomRoutePreviewModal';
import { RouteComparisonPanel } from '../components/RouteComparisonPanel';

export function ManagerRouteApprovalsPage({ refreshSignal }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [previewRoute, setPreviewRoute] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [changeRequests, setChangeRequests] = useState([]);
  const [selectedChangeRequest, setSelectedChangeRequest] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.getManagerCustomRoutes({ status: 'PENDING_NAMING' });
      setRoutes(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load pending routes');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChangeRequests = useCallback(async () => {
    try {
      const response = await adminApi.getRouteChangeRequests({ status: 'PENDING' });
      setChangeRequests(response.data || []);
    } catch (err) {
      setError((prev) => prev || err.message || 'Failed to load route change requests');
    }
  }, []);

  useEffect(() => {
    loadRoutes();
    loadChangeRequests();
  }, [loadRoutes, loadChangeRequests, refreshSignal]);

  const recordedRoutes = routes.filter((route) => route.pathPolyline);
  const awaitingDriverRoutes = routes.filter((route) => !route.pathPolyline);

  const openPreview = (route) => {
    setSaveError('');
    setPreviewRoute(route);
  };

  const closePreview = () => {
    setPreviewRoute(null);
    setSaveError('');
  };

  const handleNameRoute = async (routeName) => {
    if (!previewRoute) return;
    setSaving(true);
    setSaveError('');
    try {
      await adminApi.nameCustomRoute(previewRoute.routeId, { routeName });
      setPreviewRoute(null);
      await loadRoutes();
    } catch (err) {
      setSaveError(err.message || 'Failed to name route');
    } finally {
      setSaving(false);
    }
  };

  const openComparison = (changeRequest) => {
    setResolveError('');
    setSelectedChangeRequest(changeRequest);
  };

  const closeComparison = () => {
    setSelectedChangeRequest(null);
    setResolveError('');
  };

  const handleResolve = async (resolution) => {
    if (!selectedChangeRequest) return;
    setResolving(true);
    setResolveError('');
    try {
      await adminApi.resolveRouteChangeRequest(selectedChangeRequest._id, { resolution });
      setSelectedChangeRequest(null);
      await loadChangeRequests();
    } catch (err) {
      setResolveError(err.message || 'Failed to resolve route change request');
    } finally {
      setResolving(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#344767' }}>
          Route Approvals
        </Typography>
        <Typography variant="body2" sx={{ color: '#67748e' }}>
          Recorded custom routes from your drivers, waiting to be named and activated.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {!loading && recordedRoutes.length === 0 && awaitingDriverRoutes.length === 0 && changeRequests.length === 0 ? (
        <Alert severity="info">No custom routes are pending right now.</Alert>
      ) : null}

      {changeRequests.length > 0 && (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ color: '#67748e', fontWeight: 800 }}>
            Route Change Requests
          </Typography>
          <Grid container spacing={2}>
            {changeRequests.map((cr) => (
              <Grid key={cr._id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card sx={{ border: '1px solid rgba(234, 179, 8, 0.4)' }}>
                  <CardContent sx={{ display: 'grid', gap: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight={800}>
                        {cr.currentRouteId?.routeName || cr.currentRouteId?.routeId || 'Route'}
                      </Typography>
                      <Chip label="Off-route" color="warning" size="small" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Max deviation {Math.round(cr.deviation?.maxMeters || 0)} m &middot; {Math.round((cr.deviation?.fractionOff || 0) * 100)}% off-route
                    </Typography>
                    <Button variant="contained" size="small" onClick={() => openComparison(cr)}>
                      Review Diff
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {recordedRoutes.length > 0 && (
        <Grid container spacing={2}>
          {recordedRoutes.map((route) => (
            <Grid key={route.routeId} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.24)' }}>
                <CardContent sx={{ display: 'grid', gap: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight={800}>{route.routeId}</Typography>
                    <Chip label="Recorded" color="success" size="small" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {route.distance ?? 0} km &middot; {route.stopsCount ?? 0} stops
                  </Typography>
                  <Button variant="contained" size="small" onClick={() => openPreview(route)}>
                    Review & Name
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {awaitingDriverRoutes.length > 0 && (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ color: '#67748e', fontWeight: 800 }}>
            Awaiting driver recording
          </Typography>
          <Grid container spacing={2}>
            {awaitingDriverRoutes.map((route) => (
              <Grid key={route.routeId} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.18)', boxShadow: 'none' }}>
                  <CardContent sx={{ display: 'grid', gap: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={800}>{route.routeId}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      The assigned driver hasn't recorded this route yet.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <CustomRoutePreviewModal
        open={Boolean(previewRoute)}
        route={previewRoute}
        saving={saving}
        error={saveError}
        onClose={closePreview}
        onSubmit={handleNameRoute}
      />

      <RouteComparisonPanel
        open={Boolean(selectedChangeRequest)}
        changeRequest={selectedChangeRequest}
        resolving={resolving}
        error={resolveError}
        onClose={closeComparison}
        onResolve={handleResolve}
      />
    </Box>
  );
}
