import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';
import { readStoredAuth } from '@/lib/authSession';
import {
  TRACKING_EVENTS,
  createTrackingSocket,
  subscribeVehicle,
  unsubscribeVehicle,
} from '@/lib/tracking-socket';

const FALLBACK_POLL_MS = 30_000;
export const STALE_AFTER_MS = 90_000;

function timestampOf(record) {
  const value = record?._changedAt
    || record?.location?.receivedAt
    || record?.location?.recordedAt;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function mergeLiveRecord(restRecord, socketRecord) {
  if (!socketRecord) return restRecord;
  if (timestampOf(restRecord) > timestampOf(socketRecord)) return restRecord;

  return {
    ...restRecord,
    ...socketRecord,
    location: socketRecord.location === undefined
      ? restRecord?.location ?? null
      : socketRecord.location,
    vehicle: { ...(restRecord?.vehicle || {}), ...(socketRecord.vehicle || {}) },
    driver: socketRecord.driver === undefined ? restRecord?.driver ?? null : socketRecord.driver,
  };
}

export function trackingState(record, now = Date.now()) {
  if (!record?.live) return 'offline';
  const receivedAt = record.location?.receivedAt;
  if (receivedAt && now - new Date(receivedAt).getTime() > STALE_AFTER_MS) return 'stale';
  return 'live';
}

function updatePayload(payload) {
  return {
    vehicleId: payload.vehicleId,
    live: true,
    location: {
      lat: payload.lat,
      lng: payload.lng,
      accuracy: payload.accuracy ?? null,
      speed: payload.speed ?? null,
      heading: payload.heading ?? null,
      recordedAt: payload.recordedAt || payload.timestamp || payload.receivedAt,
      receivedAt: payload.receivedAt || payload.recordedAt || payload.timestamp,
    },
    vehicle: {
      vehicleId: payload.vehicleId,
      vehicleName: payload.vehicleName || '',
      numberPlate: payload.numberPlate || '',
      routeId: payload.routeId || '',
      serviceType: payload.serviceType || null,
    },
    _changedAt: payload.receivedAt || payload.recordedAt || payload.timestamp || new Date().toISOString(),
  };
}

// The fleet snapshot on its own, with no socket. A list screen showing one
// badge per row does not need lower-latency updates for a vehicle it is not
// following, and opening a socket per row would blow through the backend's
// subscription limits. It shares the tracking page's query key, so whichever
// page loads first warms the other.
export function useManagerFleetLive() {
  return useQuery({
    queryKey: qk.vehicles.managerLive(),
    queryFn: () => adminApi.getManagerFleetLive(),
    staleTime: 0,
    refetchInterval: FALLBACK_POLL_MS,
  });
}

export function useManagerFleetTracking(selectedVehicleId) {
  const fleetQ = useQuery({
    queryKey: qk.vehicles.managerLive(),
    queryFn: () => adminApi.getManagerFleetLive(),
    staleTime: 0,
    refetchInterval: FALLBACK_POLL_MS,
  });

  const auth = readStoredAuth();
  const token = auth?.token || auth?.accessToken || null;
  const [connected, setConnected] = useState(false);
  const [socketError, setSocketError] = useState(null);
  const [socketRecord, setSocketRecord] = useState(null);
  const socketRef = useRef(null);
  const subscribedRef = useRef('');
  const selectedRef = useRef(selectedVehicleId);
  selectedRef.current = selectedVehicleId;

  useEffect(() => {
    if (!token) {
      setConnected(false);
      setSocketError('Live stream unavailable because the session token is missing.');
      return undefined;
    }

    const socket = createTrackingSocket(token);
    socketRef.current = socket;

    const handleConnect = () => {
      setConnected(true);
      setSocketError(null);
    };
    const handleDisconnect = () => {
      subscribedRef.current = '';
      setConnected(false);
      setSocketError('Live stream disconnected. Fleet positions will keep refreshing automatically.');
    };
    const handleConnectError = () => {
      setConnected(false);
      setSocketError('Live stream disconnected. Fleet positions will keep refreshing automatically.');
    };
    const handleUpdate = (payload) => {
      if (!payload?.vehicleId || payload.vehicleId !== selectedRef.current) return;
      setSocketRecord(updatePayload(payload));
    };
    const handleStatus = (payload) => {
      if (!payload?.vehicleId || payload.vehicleId !== selectedRef.current) return;
      setSocketRecord((previous) => ({
        ...(previous || { vehicleId: payload.vehicleId }),
        live: Boolean(payload.live),
        _changedAt: payload.at || new Date().toISOString(),
      }));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on(TRACKING_EVENTS.update, handleUpdate);
    socket.on(TRACKING_EVENTS.status, handleStatus);

    return () => {
      if (subscribedRef.current) {
        unsubscribeVehicle(socket, subscribedRef.current);
      }
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off(TRACKING_EVENTS.update, handleUpdate);
      socket.off(TRACKING_EVENTS.status, handleStatus);
      socket.disconnect();
      socketRef.current = null;
      subscribedRef.current = '';
    };
  }, [token]);

  useEffect(() => {
    setSocketRecord(null);
    if (!connected || !socketRef.current) return;

    const socket = socketRef.current;
    if (subscribedRef.current && subscribedRef.current !== selectedVehicleId) {
      unsubscribeVehicle(socket, subscribedRef.current);
      subscribedRef.current = '';
    }
    if (!selectedVehicleId || subscribedRef.current === selectedVehicleId) return;

    subscribeVehicle(socket, selectedVehicleId, (response) => {
      if (selectedRef.current !== selectedVehicleId) {
        if (response?.success) unsubscribeVehicle(socket, response.data.vehicleId);
        return;
      }
      if (!response?.success) {
        setSocketError(response?.error || 'Could not start live tracking for this vehicle.');
        return;
      }
      subscribedRef.current = response.data.vehicleId;
      setSocketError(null);
      setSocketRecord({
        ...response.data,
        _changedAt: response.data.location?.receivedAt || new Date().toISOString(),
      });
    });
  }, [connected, selectedVehicleId]);

  const fleet = useMemo(() => {
    const records = fleetQ.data?.data || [];
    return records.map((record) => (
      record.vehicleId === selectedVehicleId
        ? mergeLiveRecord(record, socketRecord)
        : record
    ));
  }, [fleetQ.data, selectedVehicleId, socketRecord]);

  return {
    ...fleetQ,
    fleet,
    connected,
    socketError,
  };
}
