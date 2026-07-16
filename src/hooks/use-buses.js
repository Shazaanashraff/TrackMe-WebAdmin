import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

export function useManagerBuses() {
  return useQuery({
    queryKey: qk.buses.manager(),
    queryFn: () => adminApi.getManagerBuses(),
  });
}

export function useManagerBus(busId) {
  return useQuery({
    queryKey: qk.buses.byId(busId),
    queryFn: () => adminApi.getManagerBusById(busId),
    enabled: Boolean(busId),
  });
}

export function useManagerAssignableRoutes() {
  return useQuery({
    queryKey: qk.buses.assignableRoutes(),
    queryFn: () => adminApi.getManagerAssignableRoutes(),
  });
}

export function useManagerRequests() {
  return useQuery({
    queryKey: qk.buses.managerRequests(),
    queryFn: () => adminApi.getManagerRequests(),
  });
}

function useInvalidateBuses() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: qk.buses.all() });
}

export function useCreateBusAccountRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi.createBusAccountRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.buses.all() });
      queryClient.invalidateQueries({ queryKey: qk.buses.managerRequests() });
    },
  });
}

export function useUpdateManagerBus() {
  const invalidate = useInvalidateBuses();
  return useMutation({
    mutationFn: ({ busId, payload }) => adminApi.updateManagerBus(busId, payload),
    onSuccess: invalidate,
  });
}

export function useRequestDeleteBus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ busId, payload }) => adminApi.requestDeleteBus(busId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.buses.all() });
      queryClient.invalidateQueries({ queryKey: qk.buses.managerRequests() });
    },
  });
}

export function useResetBusAccountPassword() {
  return useMutation({
    mutationFn: ({ busId, payload }) => adminApi.resetManagerBusAccountPassword(busId, payload),
  });
}
