import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useManagers, useCreateManager } from '@/hooks/use-managers';
import { adminApi } from '@/api';

vi.mock('@/api', () => ({
  adminApi: {
    getManagers: vi.fn(),
    createManager: vi.fn(),
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

describe('use-managers hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useManagers resolves the adminApi payload', async () => {
    adminApi.getManagers.mockResolvedValue({ managers: [{ id: 'm1', name: 'Ruwan' }] });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useManagers({ status: 'active' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminApi.getManagers).toHaveBeenCalledWith({ status: 'active' });
    expect(result.current.data.managers).toHaveLength(1);
  });

  it('useManagers surfaces a thrown error as query error', async () => {
    adminApi.getManagers.mockRejectedValue(new Error('Request failed'));
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useManagers(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toBe('Request failed');
  });

  it('useCreateManager posts the payload and invalidates the managers list', async () => {
    adminApi.createManager.mockResolvedValue({ id: 'm2' });
    const { client, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCreateManager(), { wrapper });
    await result.current.mutateAsync({ name: 'Shalini', email: 's@x.lk' });

    expect(adminApi.createManager).toHaveBeenCalledWith({ name: 'Shalini', email: 's@x.lk' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['managers'] });
  });
});
