import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePendingVehicleRequests } from '@/hooks/use-operations';
import { adminApi } from '@/api';

vi.mock('@/api', () => ({
  adminApi: {
    getPendingVehicleRequests: vi.fn(),
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

describe('usePendingVehicleRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Switching the status filter used to reset the query to a clean loading
  // state (data undefined) on every toggle, flashing the full table skeleton.
  // placeholderData: keepPreviousData should keep the prior filter's rows on
  // screen while the new ones load (issue #52).
  it('keeps the previous filter\'s data visible while a new status filter loads', async () => {
    adminApi.getPendingVehicleRequests.mockResolvedValueOnce({
      data: [{ _id: 'r1', status: 'PENDING' }],
    });
    const { wrapper } = makeWrapper();

    const { result, rerender } = renderHook(
      ({ status }) => usePendingVehicleRequests({ status }),
      { wrapper, initialProps: { status: 'PENDING' } },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.data[0].status).toBe('PENDING');

    let resolveApproved;
    adminApi.getPendingVehicleRequests.mockReturnValueOnce(
      new Promise((resolve) => { resolveApproved = resolve; }),
    );

    rerender({ status: 'APPROVED' });

    // Mid-flight: still showing the PENDING rows, not reset to undefined.
    expect(result.current.data.data[0].status).toBe('PENDING');
    expect(result.current.isPlaceholderData).toBe(true);

    resolveApproved({ data: [{ _id: 'r2', status: 'APPROVED' }] });

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
    expect(result.current.data.data[0].status).toBe('APPROVED');
  });
});
