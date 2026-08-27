import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useDriverEnrollmentKey,
  useRotateDriverEnrollmentKey,
  useRevertDriverEnrollmentKey,
} from '@/hooks/use-drivers';
import { qk } from '@/lib/queryKeys';
import { adminApi } from '@/api';

vi.mock('@/api', () => ({
  adminApi: {
    getDriverEnrollmentKey: vi.fn(),
    rotateDriverEnrollmentKey: vi.fn(),
    revertDriverEnrollmentKey: vi.fn(),
  },
}));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('useDriverEnrollmentKey — a cached query, not a mutation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not fetch until enabled', () => {
    const { wrapper } = makeWrapper();
    renderHook(() => useDriverEnrollmentKey('driver-1', { enabled: false }), { wrapper });
    expect(adminApi.getDriverEnrollmentKey).not.toHaveBeenCalled();
  });

  it('fetches once enabled and exposes the key', async () => {
    adminApi.getDriverEnrollmentKey.mockResolvedValue({
      success: true,
      data: { enrollmentKey: 'RTE9-K2MP-77QX', canRevert: false },
    });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(
      () => useDriverEnrollmentKey('driver-1', { enabled: true }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminApi.getDriverEnrollmentKey).toHaveBeenCalledWith('driver-1');
    expect(result.current.data.data.enrollmentKey).toBe('RTE9-K2MP-77QX');
  });

  it('serves a cached key to a disabled instance without a network call (the offline path)', async () => {
    adminApi.getDriverEnrollmentKey.mockResolvedValue({
      success: true,
      data: { enrollmentKey: 'CACHED-0001', canRevert: false },
    });
    const { client, wrapper } = makeWrapper();

    // First mount reveals the key while "online".
    const first = renderHook(
      () => useDriverEnrollmentKey('driver-1', { enabled: true }),
      { wrapper },
    );
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    expect(adminApi.getDriverEnrollmentKey).toHaveBeenCalledTimes(1);

    // A fresh, still-disabled instance (e.g. after the row re-rendered) reads
    // the same cache entry with no further request — staleTime: Infinity.
    const second = renderHook(
      () => useDriverEnrollmentKey('driver-1', { enabled: false }),
      { wrapper },
    );
    expect(second.result.current.data.data.enrollmentKey).toBe('CACHED-0001');
    expect(adminApi.getDriverEnrollmentKey).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(qk.drivers.enrollmentKey('driver-1'))).toBeTruthy();
  });

  it('keeps a separate cache entry per driver', async () => {
    adminApi.getDriverEnrollmentKey.mockImplementation((id) =>
      Promise.resolve({ success: true, data: { enrollmentKey: `KEY-${id}`, canRevert: false } }),
    );
    const { wrapper } = makeWrapper();

    const a = renderHook(() => useDriverEnrollmentKey('driver-1', { enabled: true }), { wrapper });
    const b = renderHook(() => useDriverEnrollmentKey('driver-2', { enabled: true }), { wrapper });

    await waitFor(() => expect(a.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true));
    expect(a.result.current.data.data.enrollmentKey).toBe('KEY-driver-1');
    expect(b.result.current.data.data.enrollmentKey).toBe('KEY-driver-2');
  });
});

describe('rotate / revert write the new key into the reveal cache', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useRotateDriverEnrollmentKey.setQueryData updates qk.drivers.enrollmentKey', async () => {
    const res = { success: true, data: { enrollmentKey: 'NEW-0001', canRevert: true } };
    adminApi.rotateDriverEnrollmentKey.mockResolvedValue(res);
    const { client, wrapper } = makeWrapper();

    const { result } = renderHook(() => useRotateDriverEnrollmentKey(), { wrapper });
    await result.current.mutateAsync({ driverId: 'driver-1' });

    expect(adminApi.rotateDriverEnrollmentKey).toHaveBeenCalledWith('driver-1');
    expect(client.getQueryData(qk.drivers.enrollmentKey('driver-1'))).toEqual(res);
  });

  it('useRevertDriverEnrollmentKey.setQueryData restores the previous key in the cache', async () => {
    const res = { success: true, data: { enrollmentKey: 'OLD-0001', canRevert: false } };
    adminApi.revertDriverEnrollmentKey.mockResolvedValue(res);
    const { client, wrapper } = makeWrapper();

    const { result } = renderHook(() => useRevertDriverEnrollmentKey(), { wrapper });
    await result.current.mutateAsync({ driverId: 'driver-1' });

    expect(client.getQueryData(qk.drivers.enrollmentKey('driver-1'))).toEqual(res);
  });
});
