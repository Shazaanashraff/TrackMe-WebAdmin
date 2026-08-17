import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePendingVehicleRequests, useReviewVehicleRequest } from '@/hooks/use-operations';
import { adminApi } from '@/api';

vi.mock('@/api', () => ({
  adminApi: {
    getPendingVehicleRequests: vi.fn(),
    reviewVehicleRequest: vi.fn(),
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

  // DashboardPage's pendingCount and OperationsPage's Pending Requests stat both
  // read usePendingVehicleRequests({ status: 'PENDING' }) — same hook, same
  // params, so (per TanStack Query's structural key hashing) the same cache
  // entry within one QueryClient. useReviewVehicleRequest's onSuccess
  // invalidates qk.vehicleRequests.all(), a prefix of that entry's key, so a
  // review on one "surface" must refresh both without either needing its own
  // invalidation call (issue #61).
  it('a review action refreshes every consumer of the pending-requests query, not just the one that triggered it', async () => {
    adminApi.getPendingVehicleRequests
      .mockResolvedValueOnce({ data: [{ _id: 'r1', status: 'PENDING' }, { _id: 'r2', status: 'PENDING' }] })
      .mockResolvedValue({ data: [{ _id: 'r2', status: 'PENDING' }] });
    adminApi.reviewVehicleRequest.mockResolvedValueOnce({ success: true });
    const { wrapper } = makeWrapper();

    // Two independent consumers of the exact same query — standing in for
    // DashboardPage's stat card and OperationsPage's Pending Requests card.
    const dashboard = renderHook(() => usePendingVehicleRequests({ status: 'PENDING' }), { wrapper });
    const operations = renderHook(() => usePendingVehicleRequests({ status: 'PENDING' }), { wrapper });
    const review = renderHook(() => useReviewVehicleRequest(), { wrapper });

    await waitFor(() => expect(dashboard.result.current.isSuccess).toBe(true));
    expect(dashboard.result.current.data.data).toHaveLength(2);
    expect(operations.result.current.data.data).toHaveLength(2);
    // One network call served both consumers — confirms they share a cache entry.
    expect(adminApi.getPendingVehicleRequests).toHaveBeenCalledTimes(1);

    await review.result.current.mutateAsync({ requestId: 'r1', payload: { decision: 'APPROVE', note: '' } });

    await waitFor(() => expect(dashboard.result.current.data.data).toHaveLength(1));
    // Both consumers see the post-review count with no manual refetch/invalidation of their own.
    expect(operations.result.current.data.data).toHaveLength(1);
    // Exactly one refetch served both — not two independent per-consumer refetches.
    expect(adminApi.getPendingVehicleRequests).toHaveBeenCalledTimes(2);
  });
});
