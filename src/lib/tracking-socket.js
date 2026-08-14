import { io } from 'socket.io-client';
import { getApiBaseUrl } from './apiMode';

export const TRACKING_EVENTS = Object.freeze({
  subscribe: 'vehicle:subscribe',
  unsubscribe: 'vehicle:unsubscribe',
  update: 'vehicle:update',
  status: 'vehicle:status',
});

export function createTrackingSocket(token) {
  return io(getApiBaseUrl(), {
    transports: ['websocket'],
    auth: { token },
  });
}

export function subscribeVehicle(socket, vehicleId, callback) {
  socket.emit(TRACKING_EVENTS.subscribe, { vehicleId }, callback);
}

export function unsubscribeVehicle(socket, vehicleId, callback) {
  if (!vehicleId) return;
  socket.emit(TRACKING_EVENTS.unsubscribe, { vehicleId }, callback);
}
