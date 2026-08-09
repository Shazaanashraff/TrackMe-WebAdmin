import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

export function useEnrollmentRequests(status = 'PENDING') {
  return useQuery({
    queryKey: qk.enrollmentRequests.list(status),
    queryFn: () => adminApi.getEnrollmentRequests(status),
  });
}

// Drives the nav badge, so it is fetched on every manager screen rather than
// only on the requests page. Kept to a count so that stays cheap. Disabled for
// super-admins, who have no drivers of their own and would only get a 403.
export function useEnrollmentRequestCount({ enabled = true } = {}) {
  return useQuery({
    queryKey: qk.enrollmentRequests.count(),
    queryFn: () => adminApi.getEnrollmentRequestCount(),
    select: (res) => res?.data?.count ?? 0,
    enabled,
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
