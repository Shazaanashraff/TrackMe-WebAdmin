import { useMemo } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { decodePolyline } from '../lib/polyline';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const DEFAULT_CENTER = [7.8731, 80.7718];

function RouteMap({ polyline, stops, testId }) {
  const pathPoints = useMemo(() => decodePolyline(polyline), [polyline]);
  const center = pathPoints[0] || (stops?.[0] ? [stops[0].lat, stops[0].lng] : DEFAULT_CENTER);

  return (
    <Box sx={{ height: 320, borderRadius: 2, overflow: 'hidden' }} data-testid={testId}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {pathPoints.length > 1 ? <Polyline positions={pathPoints} color="#22d3ee" weight={4} /> : null}
        {(stops || []).map((stop, i) => (
          <Marker key={`${stop.lat}-${stop.lng}-${i}`} position={[stop.lat, stop.lng]} icon={markerIcon} />
        ))}
      </MapContainer>
    </Box>
  );
}

// Off-route diff resolver (Phase 2): shows the manager the currently saved
// route next to the driver-recorded (or auto-flagged) candidate, with
// deviation stats, so they can keep the old geometry or adopt the new one.
export function RouteComparisonPanel({ open, changeRequest, resolving, error, onClose, onResolve }) {
  const currentRoute = changeRequest?.currentRouteId;
  const candidate = changeRequest?.candidate;
  const deviation = changeRequest?.deviation;

  const handleClose = () => {
    if (resolving) return;
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <DialogTitle>Review Route Change</DialogTitle>
      <DialogContent dividers sx={{ display: 'grid', gap: 1.5, pt: 2 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}

        {deviation ? (
          <Stack direction="row" spacing={1}>
            <Chip label={`Max deviation: ${Math.round(deviation.maxMeters)} m`} size="small" color="warning" />
            <Chip label={`${Math.round((deviation.fractionOff || 0) * 100)}% of points off-route`} size="small" />
            <Chip label={`${deviation.sampleCount} GPS samples`} size="small" />
          </Stack>
        ) : null}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
              Current Route {currentRoute?.distance != null ? `(${currentRoute.distance} km)` : ''}
            </Typography>
            <RouteMap polyline={currentRoute?.pathPolyline} stops={currentRoute?.stops} testId="current-route-map" />
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
              Candidate (New) {candidate?.distance != null ? `(${candidate.distance} km)` : ''}
            </Typography>
            <RouteMap polyline={candidate?.pathPolyline} stops={candidate?.stops} testId="candidate-route-map" />
            <Chip
              sx={{ mt: 1 }}
              size="small"
              label={candidate?.snapped ? 'Snapped to roads' : 'Raw GPS path'}
              color={candidate?.snapped ? 'success' : 'warning'}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={resolving}>Cancel</Button>
        <Button variant="outlined" disabled={resolving} onClick={() => onResolve?.('KEEP_OLD')}>
          Keep Current
        </Button>
        <Button variant="contained" disabled={resolving} onClick={() => onResolve?.('ADOPT_NEW')}>
          {resolving ? 'Saving...' : 'Adopt New'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
