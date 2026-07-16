import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

export function useManagers(params = {}) {
  return useQuery({
    queryKey: qk.managers.list(params),
    queryFn: () => adminApi.getManagers(params),
  });
}

function useInvalidateManagers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: qk.managers.all() });
}

export function useCreateManager() {
  const invalidate = useInvalidateManagers();
  return useMutation({
    mutationFn: (payload) => adminApi.createManager(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateManager() {
  const invalidate = useInvalidateManagers();
  return useMutation({
    mutationFn: ({ managerId, payload }) => adminApi.updateManager(managerId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateManagerStatus() {
  const invalidate = useInvalidateManagers();
  return useMutation({
    mutationFn: ({ managerId, payload }) => adminApi.updateManagerStatus(managerId, payload),
    onSuccess: invalidate,
  });
}

export function useResetManagerPassword() {
  return useMutation({
    mutationFn: ({ managerId, payload }) => adminApi.resetManagerPassword(managerId, payload),
  });
}

export function useAssignBusesToManager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ managerId, busIds }) => adminApi.assignBusesToManager(managerId, busIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.managers.all() });
      queryClient.invalidateQueries({ queryKey: qk.buses.all() });
    },
  });
}
