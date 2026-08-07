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

export function useDeleteManager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ managerId }) => adminApi.deleteManager(managerId),
    onSuccess: () => {
      // Deleting a manager unassigns their vehicles, so the vehicle lists go stale too.
      queryClient.invalidateQueries({ queryKey: qk.managers.all() });
      queryClient.invalidateQueries({ queryKey: qk.vehicles.all() });
    },
  });
}

export function useResetManagerPassword() {
  return useMutation({
    mutationFn: ({ managerId, payload }) => adminApi.resetManagerPassword(managerId, payload),
  });
}

export function useAssignVehiclesToManager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ managerId, vehicleIds }) => adminApi.assignVehiclesToManager(managerId, vehicleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.managers.all() });
      queryClient.invalidateQueries({ queryKey: qk.vehicles.all() });
    },
  });
}
