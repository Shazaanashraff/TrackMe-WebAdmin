import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from '@mui/material';
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

// Review + naming modal for a driver-recorded custom route. Shown from the
// Route Approvals page once a route has status PENDING_NAMING with geometry.
export function CustomRoutePreviewModal({ open, route, saving, error, onClose, onSubmit }) {
  const [routeName, setRouteName] = useState('');

  const pathPoints = useMemo(() => decodePolyline(route?.pathPolyline), [route?.pathPolyline]);
  const stops = route?.stops || [];
  const center = pathPoints[0] || (stops[0] ? [stops[0].lat, stops[0].lng] : DEFAULT_CENTER);

  const handleClose = () => {
    if (saving) return;
    setRouteName('');
    onClose?.();
  };

  const handleSubmit = () => {
    if (!routeName.trim()) return;
    onSubmit?.(routeName.trim());
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Review Recorded Route</DialogTitle>
      <DialogContent dividers sx={{ display: 'grid', gap: 1.5, pt: 2 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}

        <Stack direction="row" spacing={1}>
          <Chip label={`${route?.distance ?? 0} km`} size="small" />
          <Chip label={`${stops.length} stops`} size="small" />
          <Chip
            label={route?.recordedMeta?.snapped ? 'Snapped to roads' : 'Raw GPS path'}
            size="small"
            color={route?.recordedMeta?.snapped ? 'success' : 'warning'}
          />
        </Stack>

        <Box sx={{ height: 360, borderRadius: 2, overflow: 'hidden' }} data-testid="route-preview-map">
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {pathPoints.length > 1 ? <Polyline positions={pathPoints} color="#22d3ee" weight={4} /> : null}
            {stops.map((stop, i) => (
              <Marker key={`${stop.lat}-${stop.lng}-${i}`} position={[stop.lat, stop.lng]} icon={markerIcon} />
            ))}
          </MapContainer>
        </Box>

        <TextField
          label="Route Name"
          size="small"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
          placeholder="e.g. Morning School Run"
          required
          inputProps={{ 'data-testid': 'route-name-input' }}
        />
        <Typography variant="caption" color="text.secondary">
          This name is private to your account — reusable for other drivers, never shown publicly.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving || !routeName.trim()}>
          {saving ? 'Saving...' : 'Name & Activate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
