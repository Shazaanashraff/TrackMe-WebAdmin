import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Card, CardContent, MenuItem, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { adminApi } from '../api';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const DEFAULT_CENTER = [7.8731, 80.7718];
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

export function ManagerTrackingPage({ refreshSignal }) {
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [windowMinutes, setWindowMinutes] = useState(15);
  const [locationData, setLocationData] = useState(null);
  const [error, setError] = useState('');

  const loadBuses = useCallback(async () => {
    try {
      const response = await adminApi.getManagerBuses();
      const rows = response.data || [];
      setBuses(rows);
      if (rows.length > 0 && !selectedBusId) {
        setSelectedBusId(rows[0].busId);
      }
    } catch (err) {
      setError(err.message || 'Failed to load buses for tracking');
    }
  }, [selectedBusId]);

  const loadLocation = useCallback(async () => {
    if (!selectedBusId) return;
    setError('');
    try {
      const response = await adminApi.getManagerBusLocation(selectedBusId, windowMinutes);
      setLocationData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load bus location');
    }
  }, [selectedBusId, windowMinutes]);

  useEffect(() => {
    loadBuses();
  }, [loadBuses, refreshSignal]);

  useEffect(() => {
    loadLocation();
    if (!selectedBusId) return undefined;
    const timer = setInterval(loadLocation, 10000);
    return () => clearInterval(timer);
  }, [loadLocation, selectedBusId]);

  useEffect(() => {
    if (!selectedBusId) return undefined;

    let token = null;
    try {
      const cachedAuth = localStorage.getItem('admin-auth');
      const parsedAuth = cachedAuth ? JSON.parse(cachedAuth) : null;
      token = parsedAuth?.token || parsedAuth?.accessToken || null;
    } catch {
      token = null;
    }

    if (!token) return undefined;

    const socket = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: { token }
    });

    socket.on('connect', () => {
      socket.emit('manager:join-bus', { busId: selectedBusId }, () => {});
    });

    socket.on('bus:update', (payload) => {
      if (!payload || payload.busId !== selectedBusId) return;

      setLocationData((prev) => {
        const history = [...(prev?.history || [])];
        history.push({
          lat: payload.lat,
          lng: payload.lng,
          timestamp: payload.timestamp,
          speed: payload.speed,
          accuracy: payload.accuracy,
          busId: payload.busId,
          routeId: payload.routeId || prev?.bus?.routeId
        });

        const cutoff = Date.now() - windowMinutes * 60 * 1000;
        const filteredHistory = history.filter((point) => new Date(point.timestamp).getTime() >= cutoff);

        return {
          ...prev,
          bus: prev?.bus || {
            busId: payload.busId,
            busName: payload.busName,
            routeId: payload.routeId || ''
          },
          latest: {
            lat: payload.lat,
            lng: payload.lng,
            timestamp: payload.timestamp,
            speed: payload.speed,
            accuracy: payload.accuracy,
            busId: payload.busId
          },
          history: filteredHistory
        };
      });
    });

    return () => {
      socket.emit('manager:leave-bus', { busId: selectedBusId }, () => {});
      socket.disconnect();
    };
  }, [selectedBusId, windowMinutes]);

  const pathPoints = useMemo(() => {
    return (locationData?.history || []).map((point) => toLatLng(point)).filter(Boolean);
  }, [locationData]);

  const latestPoint = toLatLng(locationData?.latest);
  const center = latestPoint || pathPoints[pathPoints.length - 1] || DEFAULT_CENTER;
  const latestTimestamp = locationData?.latest?.timestamp ? new Date(locationData.latest.timestamp).toLocaleString() : 'No live point yet';
  const latestSpeed = typeof locationData?.latest?.speed === 'number' ? `${locationData.latest.speed} km/h` : 'N/A';
  const latestAccuracy = typeof locationData?.latest?.accuracy === 'number' ? `${locationData.latest.accuracy} m` : 'N/A';
  const historyPoints = locationData?.history?.length || 0;

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'grid', gap: 0.8 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#344767' }}>
          Live Tracking
        </Typography>
        <Typography variant="body2" sx={{ color: '#67748e' }}>
          Monitor bus movement in real-time and review recent path history.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.24)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                label="Select Bus"
                size="small"
                fullWidth
                value={selectedBusId}
                onChange={(e) => setSelectedBusId(e.target.value)}
              >
                {buses.map((bus) => (
                  <MenuItem key={bus._id} value={bus.busId}>{bus.busName} ({bus.busId})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                select
                label="History Window"
                size="small"
                fullWidth
                value={String(windowMinutes)}
                onChange={(e) => setWindowMinutes(Number(e.target.value))}
              >
                <MenuItem value="15">15 minutes</MenuItem>
                <MenuItem value="30">30 minutes</MenuItem>
                <MenuItem value="60">60 minutes</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Card sx={{ height: '100%', border: '1px solid rgba(100, 116, 139, 0.18)', boxShadow: 'none' }}>
                <CardContent sx={{ py: 1.2, px: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#67748e', textTransform: 'uppercase', fontWeight: 800 }}>
                    History Points
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#344767', fontWeight: 800, lineHeight: 1.2 }}>
                    {historyPoints}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.24)' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ color: '#344767', fontWeight: 800, mb: 1.5 }}>
                Map View
              </Typography>
              <Box sx={{ height: 560, borderRadius: 2, overflow: 'hidden' }}>
                <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <RecenterMap center={center} zoom={13} />
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {pathPoints.length > 1 ? <Polyline positions={pathPoints} color="#22d3ee" weight={4} /> : null}

                  {latestPoint ? (
                    <Marker position={latestPoint} icon={markerIcon}>
                      <Tooltip direction="top" offset={[0, -12]} opacity={1} permanent>
                        {locationData?.bus?.busName || selectedBusId}
                      </Tooltip>
                    </Marker>
                  ) : null}
                </MapContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.24)', height: '100%' }}>
            <CardContent sx={{ p: 2.5, display: 'grid', gap: 1.5 }}>
              <Typography variant="subtitle1" sx={{ color: '#344767', fontWeight: 800 }}>
                Live Status
              </Typography>

              <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                <Typography variant="caption" sx={{ color: '#67748e', textTransform: 'uppercase', fontWeight: 800 }}>
                  Latest Timestamp
                </Typography>
                <Typography variant="body2" sx={{ color: '#344767', fontWeight: 600 }}>
                  {latestTimestamp}
                </Typography>
              </Box>

              <Grid container spacing={1.5}>
                <Grid size={6}>
                  <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                    <Typography variant="caption" sx={{ color: '#67748e', textTransform: 'uppercase', fontWeight: 800 }}>
                      Speed
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#344767', fontWeight: 800 }}>
                      {latestSpeed}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={6}>
                  <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                    <Typography variant="caption" sx={{ color: '#67748e', textTransform: 'uppercase', fontWeight: 800 }}>
                      Accuracy
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#344767', fontWeight: 800 }}>
                      {latestAccuracy}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                <Typography variant="caption" sx={{ color: '#67748e', textTransform: 'uppercase', fontWeight: 800 }}>
                  Selected Bus
                </Typography>
                <Typography variant="body2" sx={{ color: '#344767', fontWeight: 600 }}>
                  {locationData?.bus?.busName || selectedBusId || 'No bus selected'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#67748e' }}>
                  Route: {locationData?.bus?.routeId || 'N/A'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
