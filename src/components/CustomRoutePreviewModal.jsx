import { useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { decodePolyline } from '../lib/polyline';
import { ROUTE_POLYLINE_COLOR } from '../lib/map-tokens';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
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
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Recorded Route</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">{route?.distance ?? 0} km</Badge>
            <Badge variant="secondary">{stops.length} stops</Badge>
            <Badge variant={route?.recordedMeta?.snapped ? 'default' : 'outline'}>
              {route?.recordedMeta?.snapped ? 'Snapped to roads' : 'Raw GPS path'}
            </Badge>
          </div>

          <div className="h-[360px] rounded-xl overflow-hidden" data-testid="route-preview-map">
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {pathPoints.length > 1 ? <Polyline positions={pathPoints} color={ROUTE_POLYLINE_COLOR} weight={4} /> : null}
              {stops.map((stop, i) => (
                <Marker
                  key={`${stop.lat}-${stop.lng}-${i}`}
                  position={[stop.lat, stop.lng]}
                  icon={markerIcon}
                />
              ))}
            </MapContainer>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="route-name-field">Route Name</Label>
            <Input
              id="route-name-field"
              data-testid="route-name-input"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="e.g. Morning School Run"
            />
            <p className="text-xs text-muted-foreground">
              This name is private to your account, reusable for other drivers and never shown publicly.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !routeName.trim()}>
            {saving ? 'Saving...' : 'Name & Activate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
