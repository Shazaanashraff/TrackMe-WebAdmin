import { useEffect, useMemo, useState } from 'react';
import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { AlertTriangle, Bus as VehicleIcon, MapPin, WifiOff } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { LiveIndicator } from '@/components/shared/live-indicator';
import { RelativeTime } from '@/components/shared/relative-time';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { CardSkeleton } from '@/components/shared/card-skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getGoogleMapsApiKey } from '@/lib/googleMaps';
import { trackingState, useManagerFleetTracking } from '@/hooks/use-tracking';

const DEFAULT_CENTER = { lat: 7.8731, lng: 80.7718 };
const SRI_LANKA_BOUNDS = { north: 10, south: 5.7, west: 79.4, east: 82.1 };

function toPoint(location) {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function MapViewport({ selectedPoint, fleetPoints }) {
  const map = useMap();
  const maps = useMapsLibrary('maps');
  const selectedLat = selectedPoint?.lat;
  const selectedLng = selectedPoint?.lng;
  const boundsKey = fleetPoints.map((point) => `${point.lat},${point.lng}`).join('|');

  useEffect(() => {
    if (!map || !maps) return;
    if (Number.isFinite(selectedLat) && Number.isFinite(selectedLng)) {
      map.panTo({ lat: selectedLat, lng: selectedLng });
      map.setZoom(15);
      return;
    }
    if (fleetPoints.length > 1) {
      const bounds = new maps.LatLngBounds();
      fleetPoints.forEach((point) => bounds.extend(point));
      map.fitBounds(bounds, 40);
    } else if (fleetPoints.length === 1) {
      map.setCenter(fleetPoints[0]);
      map.setZoom(13);
    }
  }, [boundsKey, fleetPoints, map, maps, selectedLat, selectedLng]);

  return null;
}

function markerColors(state) {
  const styles = getComputedStyle(document.documentElement);
  const fillColor = state === 'live'
    ? styles.getPropertyValue('--status-settled').trim()
    : state === 'stale'
      ? styles.getPropertyValue('--status-warning').trim()
      : styles.getPropertyValue('--muted-foreground').trim();
  return {
    fillColor,
    strokeColor: styles.getPropertyValue('--surface').trim(),
  };
}

function FleetMarkers({ plotted, selectedVehicleId, onSelect }) {
  const map = useMap();
  const maps = useMapsLibrary('maps');
  const plottedKey = plotted.map(({ record, point }) => (
    `${record.vehicleId}:${point.lat}:${point.lng}:${trackingState(record)}`
  )).join('|');

  useEffect(() => {
    if (!map || !maps) return undefined;

    const markers = plotted.map(({ record, point }) => {
      const selected = record.vehicleId === selectedVehicleId;
      const state = trackingState(record);
      const colors = markerColors(state);
      const marker = new maps.Marker({
        map,
        position: point,
        title: record.vehicle?.vehicleName || record.vehicleId,
        zIndex: selected ? 2 : 1,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: selected ? 11 : 8,
          fillColor: colors.fillColor,
          fillOpacity: selected ? 0.95 : 0.72,
          strokeColor: colors.strokeColor,
          strokeOpacity: 1,
          strokeWeight: selected ? 4 : 2,
        },
      });
      const listener = marker.addListener('click', () => onSelect(record.vehicleId));
      return { marker, listener };
    });

    return () => {
      markers.forEach(({ marker, listener }) => {
        listener?.remove();
        marker.setMap(null);
      });
    };
  }, [map, maps, onSelect, plotted, plottedKey, selectedVehicleId]);

  return null;
}

function formatSpeed(speed) {
  const metersPerSecond = Number(speed);
  if (!Number.isFinite(metersPerSecond)) return 'Not reported';
  return `${Math.round(metersPerSecond * 3.6)} km/h`;
}

function formatHeading(heading) {
  const degrees = Number(heading);
  if (!Number.isFinite(degrees)) return 'Not reported';
  const normalized = ((degrees % 360) + 360) % 360;
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return `${Math.round(normalized)}° ${directions[Math.round(normalized / 45) % 8]}`;
}

function VehicleListItem({ record, selected, onSelect }) {
  const state = trackingState(record);
  return (
    <button
      type="button"
      onClick={() => onSelect(record.vehicleId)}
      aria-pressed={selected}
      className={cn(
        'w-full border-b border-border px-4 py-3 text-left transition-colors last:border-b-0',
        'hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        selected && 'bg-primary/10',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {record.vehicle?.vehicleName || record.vehicleId}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {record.vehicle?.numberPlate || record.vehicleId}
          </p>
        </div>
        <LiveIndicator state={state} />
      </div>
      <p className="mt-2 truncate text-xs text-muted-foreground">
        {record.driver?.name || 'No driver assigned'}
      </p>
    </button>
  );
}

function SelectedVehicleDetails({ record }) {
  if (!record) {
    return (
      <EmptyState
        icon={MapPin}
        title="Select a vehicle"
        description="Choose a fleet vehicle to follow its live position."
      />
    );
  }

  const state = trackingState(record);
  const location = record.location;
  const lastUpdate = location?.receivedAt || location?.recordedAt;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">
            {record.vehicle?.vehicleName || record.vehicleId}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {record.vehicle?.numberPlate || record.vehicleId}
          </p>
        </div>
        <LiveIndicator state={state} />
      </div>

      {record.live && !location ? (
        <Alert variant="info">
          <AlertDescription>
            The driver is live. Waiting for the first GPS fix.
          </AlertDescription>
        </Alert>
      ) : null}

      {state === 'stale' ? (
        <Alert variant="warning">
          <AlertTriangle aria-hidden />
          <AlertDescription>
            This GPS position is older than 90 seconds.
          </AlertDescription>
        </Alert>
      ) : null}

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Speed</dt>
          <dd className="mt-1 font-mono text-sm font-medium tabular-nums text-foreground">
            {formatSpeed(location?.speed)}
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Heading</dt>
          <dd className="mt-1 font-mono text-sm font-medium tabular-nums text-foreground">
            {formatHeading(location?.heading)}
          </dd>
        </div>
      </dl>

      <dl className="space-y-3 border-t border-border pt-4 text-sm">
        <div className="flex items-start justify-between gap-4">
          <dt className="text-muted-foreground">Driver</dt>
          <dd className="text-right font-medium text-foreground">{record.driver?.name || 'Unassigned'}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="text-muted-foreground">Route</dt>
          <dd className="max-w-[60%] truncate text-right font-mono text-xs text-foreground">
            {record.vehicle?.routeId || 'Not assigned'}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="text-muted-foreground">Last position</dt>
          <dd>{lastUpdate ? <RelativeTime date={lastUpdate} /> : <span className="text-muted-foreground">Never</span>}</dd>
        </div>
        {location ? (
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Coordinates</dt>
            <dd className="font-mono text-xs tabular-nums text-foreground">
              {Number(location.lat).toFixed(5)}, {Number(location.lng).toFixed(5)}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function ManagerTrackingPage() {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const tracking = useManagerFleetTracking(selectedVehicleId);
  const fleet = useMemo(() => tracking.fleet || [], [tracking.fleet]);

  useEffect(() => {
    if (!fleet.length) {
      setSelectedVehicleId('');
      return;
    }
    if (fleet.some((record) => record.vehicleId === selectedVehicleId)) return;
    const firstWithPosition = fleet.find((record) => toPoint(record.location));
    setSelectedVehicleId((firstWithPosition || fleet[0]).vehicleId);
  }, [fleet, selectedVehicleId]);

  const selected = fleet.find((record) => record.vehicleId === selectedVehicleId) || null;
  const plotted = useMemo(
    () => fleet.map((record) => ({ record, point: toPoint(record.location) })).filter(({ point }) => point),
    [fleet],
  );
  const fleetPoints = useMemo(() => plotted.map(({ point }) => point), [plotted]);
  const selectedPoint = toPoint(selected?.location);
  const liveCount = fleet.filter((record) => trackingState(record) === 'live').length;
  const pageDescription = tracking.isLoading
    ? 'Loading current fleet positions…'
    : tracking.error
      ? 'Monitor current positions across your fleet.'
      : `${liveCount} of ${fleet.length} fleet vehicles broadcasting now.`;
  const googleMapsApiKey = getGoogleMapsApiKey();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live tracking"
        description={pageDescription}
        actions={fleet.length ? (
          <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
            <SelectTrigger aria-label="Select vehicle" className="w-56 max-w-[44vw]">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              {fleet.map((record) => (
                <SelectItem key={record.vehicleId} value={record.vehicleId}>
                  {record.vehicle?.vehicleName || record.vehicleId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      />

      {tracking.socketError ? (
        <Alert variant="warning">
          <WifiOff aria-hidden />
          <AlertDescription>{tracking.socketError}</AlertDescription>
        </Alert>
      ) : null}

      {tracking.isLoading ? <CardSkeleton lines={8} /> : null}

      {!tracking.isLoading && tracking.error ? (
        <Card>
          <ErrorState error={tracking.error} onRetry={tracking.refetch} />
        </Card>
      ) : null}

      {!tracking.isLoading && !tracking.error && fleet.length === 0 ? (
        <Card>
          <EmptyState
            icon={VehicleIcon}
            title="No vehicles in your fleet"
            description="Add a vehicle before opening live tracking."
          />
        </Card>
      ) : null}

      {!tracking.isLoading && !tracking.error && fleet.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="grid min-h-[560px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div
              role="region"
              aria-label="Fleet location map"
              className="relative min-h-[420px] overflow-hidden border-b border-border lg:border-b-0 lg:border-r"
            >
              {plotted.length === 0 ? (
                <div
                  data-testid="fleet-map-idle"
                  className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 bg-surface-muted px-6 text-center"
                >
                  <VehicleIcon aria-hidden className="size-8 text-muted-foreground" />
                  <p className="font-semibold text-foreground">No vehicle is broadcasting</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    The map opens as soon as a driver starts a journey. Positions appear here in
                    real time.
                  </p>
                </div>
              ) : googleMapsApiKey ? (
                <APIProvider apiKey={googleMapsApiKey}>
                  <Map
                    defaultCenter={selectedPoint || DEFAULT_CENTER}
                    defaultZoom={selectedPoint ? 15 : 8}
                    minZoom={6}
                    restriction={{ latLngBounds: SRI_LANKA_BOUNDS, strictBounds: true }}
                    gestureHandling="greedy"
                    disableDefaultUI
                    clickableIcons={false}
                    className="h-full min-h-[420px] w-full"
                  >
                    <MapViewport selectedPoint={selectedPoint} fleetPoints={fleetPoints} />
                    <FleetMarkers
                      plotted={plotted}
                      selectedVehicleId={selectedVehicleId}
                      onSelect={setSelectedVehicleId}
                    />
                  </Map>
                </APIProvider>
              ) : (
                <div
                  data-testid="google-map-unavailable"
                  className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 bg-surface-muted px-6 text-center"
                >
                  <MapPin aria-hidden className="size-8 text-muted-foreground" />
                  <p className="font-semibold text-foreground">Google Maps unavailable</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Set VITE_GOOGLE_MAPS_KEY to display live fleet positions.
                  </p>
                </div>
              )}

              <div className="absolute right-3 top-3 z-[500] rounded-lg border border-border bg-surface px-3 py-2">
                <LiveIndicator state={tracking.connected ? 'live' : 'offline'} />
              </div>
            </div>

            <aside aria-label="Fleet vehicles" className="flex min-h-0 flex-col bg-surface">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Fleet vehicles</p>
                <p className="text-xs text-muted-foreground">Select one for live updates</p>
              </div>
              <div className="max-h-64 overflow-y-auto lg:max-h-none lg:flex-1">
                {fleet.map((record) => (
                  <VehicleListItem
                    key={record.vehicleId}
                    record={record}
                    selected={record.vehicleId === selectedVehicleId}
                    onSelect={setSelectedVehicleId}
                  />
                ))}
              </div>
              <div className="border-t border-border">
                <SelectedVehicleDetails record={selected} />
              </div>
            </aside>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
