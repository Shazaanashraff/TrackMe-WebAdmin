import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const socket = { emit: vi.fn() };
  return { socket, io: vi.fn(() => socket) };
});

vi.mock('socket.io-client', () => ({ io: mocks.io }));
vi.mock('@/lib/apiMode', () => ({ getApiBaseUrl: () => 'http://tracking.test' }));

import {
  createTrackingSocket,
  subscribeVehicle,
  unsubscribeVehicle,
} from '@/lib/tracking-socket';

describe('tracking socket contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens an authenticated websocket against the active API mode', () => {
    expect(createTrackingSocket('access-token')).toBe(mocks.socket);
    expect(mocks.io).toHaveBeenCalledWith('http://tracking.test', {
      transports: ['websocket'],
      auth: { token: 'access-token' },
    });
  });

  it('subscribes and unsubscribes with the vehicle-scoped event names', () => {
    const ack = vi.fn();
    subscribeVehicle(mocks.socket, 'VH-001', ack);
    unsubscribeVehicle(mocks.socket, 'VH-001', ack);

    expect(mocks.socket.emit).toHaveBeenNthCalledWith(1, 'vehicle:subscribe', { vehicleId: 'VH-001' }, ack);
    expect(mocks.socket.emit).toHaveBeenNthCalledWith(2, 'vehicle:unsubscribe', { vehicleId: 'VH-001' }, ack);
  });
});
