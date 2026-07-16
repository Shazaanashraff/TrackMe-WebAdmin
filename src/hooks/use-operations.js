import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

export function useOperationsOverview() {
  return useQuery({
    queryKey: qk.operations.overview(),
    queryFn: () => adminApi.getOperationsOverview(),
  });
}

export function useOperationManagerDetail(managerId) {
  return useQuery({
    queryKey: qk.operations.managerDetail(managerId),
    queryFn: () => adminApi.getOperationManagerDetail(managerId),
    enabled: Boolean(managerId),
  });
}

export function usePendingBusRequests(params = {}) {
  return useQuery({
    queryKey: qk.busRequests.pending(params),
    queryFn: () => adminApi.getPendingBusRequests(params),
  });
}

export function useAuditLogs(params = {}) {
  return useQuery({
    queryKey: qk.operations.audit(params),
    queryFn: () => adminApi.getAuditLogs(params),
  });
}

export function useReviewBusRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, payload }) => adminApi.reviewBusRequest(requestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.busRequests.all() });
      queryClient.invalidateQueries({ queryKey: qk.operations.overview() });
    },
  });
}

export function useUpdateBus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ busId, payload }) => adminApi.updateBus(busId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.buses.all() });
      queryClient.invalidateQueries({ queryKey: qk.operations.overview() });
    },
  });
}
