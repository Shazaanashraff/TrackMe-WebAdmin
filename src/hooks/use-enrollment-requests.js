import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

export function useEnrollmentRequests(status = 'PENDING') {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: qk.enrollmentRequests.list(status),
    queryFn: () => adminApi.getEnrollmentRequests(status),
  });

  // The queue itself is the freshest answer to "how many are pending", so it
  // feeds the nav badge rather than leaving it on whatever the count call last
  // returned, so the page cannot list requests the badge does not show.
  const pending = status === 'PENDING' && Array.isArray(query.data?.data) ? query.data.data.length : null;
  useEffect(() => {
    if (pending === null) return;
    queryClient.setQueryData(qk.enrollmentRequests.count(), { success: true, data: { count: pending } });
  }, [pending, queryClient]);

  return query;
}

// Drives the nav badge, so it is fetched on every manager screen rather than
// only on the requests page. Kept to a count so that stays cheap. Disabled for
// super-admins, who have no drivers of their own and would only get a 403.
//
// The app shell that renders the badge never unmounts, so without a poll the
// count would stay at whatever it was when the manager signed in and a request
// arriving mid-session would show up only after a reload.
export const ENROLLMENT_COUNT_POLL_MS = 30_000;

export function useEnrollmentRequestCount({ enabled = true } = {}) {
  return useQuery({
    queryKey: qk.enrollmentRequests.count(),
    queryFn: () => adminApi.getEnrollmentRequestCount(),
    select: (res) => res?.data?.count ?? 0,
    enabled,
    staleTime: 0,
    refetchInterval: ENROLLMENT_COUNT_POLL_MS,
    refetchOnWindowFocus: true,
  });
}

// A decision moves the request out of the pending list and changes the badge,
// so both go stale together.
function useDecideEnrollmentRequest(decide) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => decide(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.enrollmentRequests.all() });
    },
  });
}

export function useApproveEnrollmentRequest() {
  return useDecideEnrollmentRequest((id) => adminApi.approveEnrollmentRequest(id));
}

export function useRejectEnrollmentRequest() {
  return useDecideEnrollmentRequest((id) => adminApi.rejectEnrollmentRequest(id));
}
