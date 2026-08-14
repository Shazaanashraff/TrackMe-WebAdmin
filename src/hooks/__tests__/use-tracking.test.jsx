import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const listeners = {};
  const socket = {
    connected: true,
    on: vi.fn((event, callback) => { listeners[event] = callback; }),
    off: vi.fn(),
    disconnect: vi.fn(),
  };
  return {
    listeners,
    socket,
    getManagerFleetLive: vi.fn(),
    createTrackingSocket: vi.fn(() => socket),
    subscribeVehicle: vi.fn((_, vehicleId, callback) => callback({
      success: true,
      data: {
        vehicleId,
        live: true,
        location: null,
        vehicle: { vehicleId, vehicleName: vehicleId },
        driver: null,
      },
    })),
    unsubscribeVehicle: vi.fn(),
  };
});

vi.mock('@/api', () => ({
  adminApi: { getManagerFleetLive: mocks.getManagerFleetLive },
}));
vi.mock('@/lib/authSession', () => ({
  readStoredAuth: () => ({ token: 'access-token' }),
}));
vi.mock('@/lib/tracking-socket', () => ({
  TRACKING_EVENTS: {
    subscribe: 'vehicle:subscribe',
    unsubscribe: 'vehicle:unsubscribe',
    update: 'vehicle:update',
    status: 'vehicle:status',
  },
  createTrackingSocket: mocks.createTrackingSocket,
  subscribeVehicle: mocks.subscribeVehicle,
  unsubscribeVehicle: mocks.unsubscribeVehicle,
}));

import {
  mergeLiveRecord,
  trackingState,
  useManagerFleetTracking,
} from '@/hooks/use-tracking';

const REST_RECORD = {
  vehicleId: 'VH-001',
  live: false,
  location: {
    lat: 7.2,
    lng: 80.6,
    receivedAt: '2026-08-14T00:00:00.000Z',
  },
  vehicle: { vehicleId: 'VH-001', vehicleName: 'Shuttle One', numberPlate: 'CAA-1001' },
  driver: { _id: 'd1', name: 'Kamal' },
};

describe('live tracking merge helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mocks.listeners).forEach((key) => delete mocks.listeners[key]);
    mocks.getManagerFleetLive.mockResolvedValue({ data: [REST_RECORD] });
  });

  it('merges a newer socket position without losing REST-only driver metadata', () => {
    const merged = mergeLiveRecord(REST_RECORD, {
      vehicleId: 'VH-001',
      live: true,
      location: { lat: 7.3, lng: 80.7, receivedAt: '2026-08-14T00:00:05.000Z' },
      vehicle: { vehicleId: 'VH-001', vehicleName: 'Shuttle One' },
      _changedAt: '2026-08-14T00:00:05.000Z',
    });

    expect(merged.live).toBe(true);
    expect(merged.location.lat).toBe(7.3);
    expect(merged.driver.name).toBe('Kamal');
    expect(merged.vehicle.numberPlate).toBe('CAA-1001');
  });

  it('keeps a newer REST poll over an older socket patch', () => {
    const merged = mergeLiveRecord(REST_RECORD, {
      vehicleId: 'VH-001',
      live: true,
      _changedAt: '2026-08-13T23:59:59.000Z',
    });

    expect(merged).toBe(REST_RECORD);
  });

  it('distinguishes live, stale and offline vehicle state', () => {
    const now = new Date('2026-08-14T00:02:00.000Z').getTime();
    expect(trackingState({ live: false }, now)).toBe('offline');
    expect(trackingState({ live: true, location: null }, now)).toBe('live');
    expect(trackingState({
      live: true,
      location: { receivedAt: '2026-08-14T00:01:30.000Z' },
    }, now)).toBe('live');
    expect(trackingState({
      live: true,
      location: { receivedAt: '2026-08-14T00:00:00.000Z' },
    }, now)).toBe('stale');
  });

  it('subscribes the selected vehicle, switches rooms, and cleans up the socket', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender, unmount } = renderHook(
      ({ vehicleId }) => useManagerFleetTracking(vehicleId),
      { wrapper, initialProps: { vehicleId: 'VH-001' } },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    act(() => mocks.listeners.connect());
    await waitFor(() => {
      expect(mocks.subscribeVehicle).toHaveBeenCalledWith(
        mocks.socket,
        'VH-001',
        expect.any(Function),
      );
    });

    rerender({ vehicleId: 'VH-002' });
    await waitFor(() => {
      expect(mocks.unsubscribeVehicle).toHaveBeenCalledWith(mocks.socket, 'VH-001');
      expect(mocks.subscribeVehicle).toHaveBeenLastCalledWith(
        mocks.socket,
        'VH-002',
        expect.any(Function),
      );
    });

    unmount();
    expect(mocks.unsubscribeVehicle).toHaveBeenCalledWith(mocks.socket, 'VH-002');
    expect(mocks.socket.disconnect).toHaveBeenCalled();
  });
});
