import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip as LeafletTooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { PageHeader } from '@/components/shared/page-header';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useManagerVehicles } from '@/hooks/use-vehicles';
import { useManagerVehicleLocation } from '@/hooks/use-tracking';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DEFAULT_CENTER = [7.8731, 80.7718];
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const WINDOW_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '60 minutes', value: 60 },
];

function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (!Array.isArray(center) || center.length !== 2) return;
    if (!Number.isFinite(center[0]) || !Number.isFinite(center[1])) return;
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

function toLatLng(point) {
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

export function ManagerTrackingPage() {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [windowMinutes, setWindowMinutes] = useState(15);
  const [locationData, setLocationData] = useState(null);

  const vehiclesQ = useManagerVehicles();
  const vehicles = vehiclesQ.data?.data || [];

  const locationQ = useManagerVehicleLocation(selectedVehicleId, windowMinutes);

  // Auto-select first vehicle when list loads
  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].vehicleId);
    }
  }, [vehicles, selectedVehicleId]);

  // Seed locationData from the REST query; socket events append on top
  useEffect(() => {
    if (locationQ.data?.data) {
      setLocationData(locationQ.data.data);
    }
  }, [locationQ.data]);

  // Real-time socket.io updates
  useEffect(() => {
    if (!selectedVehicleId) return undefined;

    let token = null;
    try {
      const cachedAuth = localStorage.getItem('admin-auth');
      const parsedAuth = cachedAuth ? JSON.parse(cachedAuth) : null;
      token = parsedAuth?.token || parsedAuth?.accessToken || null;
    } catch {
      token = null;
    }
    if (!token) return undefined;

    const socket = io(API_BASE_URL, { transports: ['websocket'], auth: { token } });

    socket.on('connect', () => {
      socket.emit('manager:join-vehicle', { vehicleId: selectedVehicleId }, () => {});
    });

    socket.on('vehicle:update', (payload) => {
      if (!payload || payload.vehicleId !== selectedVehicleId) return;
      setLocationData((prev) => {
        const history = [...(prev?.history || [])];
        history.push({
          lat: payload.lat, lng: payload.lng,
          timestamp: payload.timestamp, speed: payload.speed,
          accuracy: payload.accuracy, vehicleId: payload.vehicleId,
          routeId: payload.routeId || prev?.vehicle?.routeId,
        });
        const cutoff = Date.now() - windowMinutes * 60 * 1000;
        return {
          ...prev,
          vehicle: prev?.vehicle || { vehicleId: payload.vehicleId, vehicleName: payload.vehicleName, routeId: payload.routeId || '' },
          latest: {
            lat: payload.lat, lng: payload.lng,
            timestamp: payload.timestamp, speed: payload.speed,
            accuracy: payload.accuracy, vehicleId: payload.vehicleId,
          },
          history: history.filter((p) => new Date(p.timestamp).getTime() >= cutoff),
        };
      });
    });

    return () => {
      socket.emit('manager:leave-vehicle', { vehicleId: selectedVehicleId }, () => {});
      socket.disconnect();
    };
  }, [selectedVehicleId, windowMinutes]);

  const pathPoints = useMemo(
    () => (locationData?.history || []).map((p) => toLatLng(p)).filter(Boolean),
    [locationData],
  );

  const latestPoint = toLatLng(locationData?.latest);
  const center = latestPoint || pathPoints[pathPoints.length - 1] || DEFAULT_CENTER;
  const latestTimestamp = locationData?.latest?.timestamp
    ? new Date(locationData.latest.timestamp).toLocaleString()
    : 'No live point yet';
  const latestSpeed = typeof locationData?.latest?.speed === 'number'
    ? `${locationData.latest.speed} km/h` : 'N/A';
  const latestAccuracy = typeof locationData?.latest?.accuracy === 'number'
    ? `${locationData.latest.accuracy} m` : 'N/A';
  const historyPoints = locationData?.history?.length || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Tracking"
        description="Monitor vehicle movement in real-time and review recent path history."
      />

      {locationQ.isError && (
        <Alert variant="destructive">
          <AlertDescription>{locationQ.error?.message || 'Failed to load vehicle location'}</AlertDescription>
        </Alert>
      )}
      {vehiclesQ.isError && (
        <Alert variant="destructive">
          <AlertDescription>{vehiclesQ.error?.message || 'Failed to load vehicles'}</AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="tracking-vehicle">Select Vehicle</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger id="tracking-vehicle">
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No vehicles found</div>
                  ) : (
                    vehicles.map((vehicle) => (
                      <SelectItem key={vehicle._id || vehicle.vehicleId} value={vehicle.vehicleId}>
                        {vehicle.vehicleName} ({vehicle.vehicleId})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tracking-window">History Window</Label>
              <Select value={String(windowMinutes)} onValueChange={(v) => setWindowMinutes(Number(v))}>
                <SelectTrigger id="tracking-window">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WINDOW_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">History Points</p>
              <p className="text-2xl font-bold font-heading mt-1 tabular-nums">{historyPoints}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Map View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[560px] rounded-lg overflow-hidden">
                <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <RecenterMap center={center} zoom={13} />
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {pathPoints.length > 1 && (
                    <Polyline positions={pathPoints} color="var(--primary)" weight={4} />
                  )}
                  {latestPoint && (
                    <Marker position={latestPoint} icon={markerIcon}>
                      <LeafletTooltip direction="top" offset={[0, -12]} opacity={1} permanent>
                        {locationData?.vehicle?.vehicleName || selectedVehicleId}
                      </LeafletTooltip>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Live Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border px-3.5 py-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Latest Timestamp</p>
                <p className="text-sm font-medium mt-0.5">{latestTimestamp}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border px-3.5 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Speed</p>
                  <p className="text-base font-bold mt-0.5">{latestSpeed}</p>
                </div>
                <div className="rounded-lg border border-border px-3.5 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Accuracy</p>
                  <p className="text-base font-bold mt-0.5">{latestAccuracy}</p>
                </div>
              </div>
              <div className="rounded-lg border border-border px-3.5 py-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Selected Vehicle</p>
                <p className="text-sm font-medium mt-0.5">
                  {locationData?.vehicle?.vehicleName || selectedVehicleId || 'No vehicle selected'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Route: {locationData?.vehicle?.routeId || 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
