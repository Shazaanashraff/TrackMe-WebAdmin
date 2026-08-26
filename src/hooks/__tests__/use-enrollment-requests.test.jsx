import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useEnrollmentRequests,
  useEnrollmentRequestCount,
  ENROLLMENT_COUNT_POLL_MS,
} from '@/hooks/use-enrollment-requests';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

vi.mock('@/api', () => ({
  adminApi: {
    getEnrollmentRequests: vi.fn(),
    getEnrollmentRequestCount: vi.fn(),
    approveEnrollmentRequest: vi.fn(),
    rejectEnrollmentRequest: vi.fn(),
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

describe('use-enrollment-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // The nav badge lives in the app shell, which stays mounted for the whole
  // session. Without the poll a request arriving after sign-in only showed up
  // once the manager reloaded the page.
  it('keeps polling the count so a request that arrives mid-session shows up', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    adminApi.getEnrollmentRequestCount
      .mockResolvedValueOnce({ success: true, data: { count: 0 } })
      .mockResolvedValue({ success: true, data: { count: 1 } });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useEnrollmentRequestCount(), { wrapper });
    await waitFor(() => expect(result.current.data).toBe(0));

    await vi.advanceTimersByTimeAsync(ENROLLMENT_COUNT_POLL_MS + 100);

    await waitFor(() => expect(result.current.data).toBe(1));
  });

  it('does not call the count endpoint when disabled for a super-admin', async () => {
    const { wrapper } = makeWrapper();

    renderHook(() => useEnrollmentRequestCount({ enabled: false }), { wrapper });

    await waitFor(() => expect(adminApi.getEnrollmentRequestCount).not.toHaveBeenCalled());
  });

  // The queue and the badge must not disagree while both are on screen.
  it('feeds the badge count from the pending queue it just loaded', async () => {
    adminApi.getEnrollmentRequests.mockResolvedValue({
      success: true,
      data: [{ _id: 'req-1' }, { _id: 'req-2' }],
    });
    const { client, wrapper } = makeWrapper();

    const { result } = renderHook(() => useEnrollmentRequests('PENDING'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await waitFor(() => expect(client.getQueryData(qk.enrollmentRequests.count()))
      .toEqual({ success: true, data: { count: 2 } }));
  });

  it('leaves the badge count alone when a non-pending queue is loaded', async () => {
    adminApi.getEnrollmentRequests.mockResolvedValue({ success: true, data: [{ _id: 'req-9' }] });
    const { client, wrapper } = makeWrapper();

    const { result } = renderHook(() => useEnrollmentRequests('APPROVED'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData(qk.enrollmentRequests.count())).toBeUndefined();
  });
});
