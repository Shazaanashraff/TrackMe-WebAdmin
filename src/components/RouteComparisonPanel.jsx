import { useMemo } from 'react';
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

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DEFAULT_CENTER = [7.8731, 80.7718];

function RouteMap({ polyline, stops, testId }) {
  const pathPoints = useMemo(() => decodePolyline(polyline), [polyline]);
  const center = pathPoints[0] || (stops?.[0] ? [stops[0].lat, stops[0].lng] : DEFAULT_CENTER);

  return (
    <div className="h-80 rounded-xl overflow-hidden" data-testid={testId}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pathPoints.length > 1 ? <Polyline positions={pathPoints} color={ROUTE_POLYLINE_COLOR} weight={4} /> : null}
        {(stops || []).map((stop, i) => (
          <Marker
            key={`${stop.lat}-${stop.lng}-${i}`}
            position={[stop.lat, stop.lng]}
            icon={markerIcon}
          />
        ))}
      </MapContainer>
    </div>
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
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Review Route Change</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {deviation ? (
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">Max deviation: {Math.round(deviation.maxMeters)} m</Badge>
              <Badge variant="secondary">
                {Math.round((deviation.fractionOff || 0) * 100)}% of points off-route
              </Badge>
              <Badge variant="secondary">{deviation.sampleCount} GPS samples</Badge>
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold mb-2">
                Current Route {currentRoute?.distance != null ? `(${currentRoute.distance} km)` : ''}
              </p>
              <RouteMap
                polyline={currentRoute?.pathPolyline}
                stops={currentRoute?.stops}
                testId="current-route-map"
              />
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">
                Candidate (New) {candidate?.distance != null ? `(${candidate.distance} km)` : ''}
              </p>
              <RouteMap
                polyline={candidate?.pathPolyline}
                stops={candidate?.stops}
                testId="candidate-route-map"
              />
              <Badge className="mt-2" variant={candidate?.snapped ? 'default' : 'outline'}>
                {candidate?.snapped ? 'Snapped to roads' : 'Raw GPS path'}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={resolving}>Cancel</Button>
          <Button variant="outline" disabled={resolving} onClick={() => onResolve?.('KEEP_OLD')}>
            Keep Current
          </Button>
          <Button disabled={resolving} onClick={() => onResolve?.('ADOPT_NEW')}>
            {resolving ? 'Saving...' : 'Adopt New'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
