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

export function usePendingVehicleRequests(params = {}) {
  return useQuery({
    queryKey: qk.vehicleRequests.pending(params),
    queryFn: () => adminApi.getPendingVehicleRequests(params),
  });
}

export function useAuditLogs(params = {}) {
  return useQuery({
    queryKey: qk.operations.audit(params),
    queryFn: () => adminApi.getAuditLogs(params),
  });
}

export function useReviewVehicleRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, payload }) => adminApi.reviewVehicleRequest(requestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.vehicleRequests.all() });
      queryClient.invalidateQueries({ queryKey: qk.operations.overview() });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, payload }) => adminApi.updateVehicle(vehicleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.vehicles.all() });
      queryClient.invalidateQueries({ queryKey: qk.operations.overview() });
    },
  });
}
