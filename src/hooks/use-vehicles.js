import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

export function useManagerVehicles() {
  return useQuery({
    queryKey: qk.vehicles.manager(),
    queryFn: () => adminApi.getManagerVehicles(),
  });
}

export function useManagerVehicle(vehicleId) {
  return useQuery({
    queryKey: qk.vehicles.byId(vehicleId),
    queryFn: () => adminApi.getManagerVehicleById(vehicleId),
    enabled: Boolean(vehicleId),
  });
}

// The routes a manager can assign a vehicle to barely change — an hour of
// staleness here is fine and saves refetching the dropdown on every dialog
// open. Route mutations invalidate qk.systemRoutes.all(), not this key, but
// this list is only ever read inside the create/edit dialogs where a
// once-an-hour refresh is imperceptible.
export const ASSIGNABLE_ROUTES_STALE_TIME = 60 * 60 * 1000;

export function useManagerAssignableRoutes() {
  return useQuery({
    queryKey: qk.vehicles.assignableRoutes(),
    queryFn: () => adminApi.getManagerAssignableRoutes(),
    staleTime: ASSIGNABLE_ROUTES_STALE_TIME,
  });
}

export function useManagerRequests() {
  return useQuery({
    queryKey: qk.vehicles.managerRequests(),
    queryFn: () => adminApi.getManagerRequests(),
  });
}

function useInvalidateVehicles() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: qk.vehicles.all() });
}

export function useCreateManagerVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi.createManagerVehicle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.vehicles.all() });
      queryClient.invalidateQueries({ queryKey: qk.vehicles.managerRequests() });
      // The vehicle comes with a driver, so the directory is stale too.
      queryClient.invalidateQueries({ queryKey: qk.drivers.all() });
    },
  });
}

export function useUpdateManagerVehicle() {
  const invalidate = useInvalidateVehicles();
  return useMutation({
    mutationFn: ({ vehicleId, payload }) => adminApi.updateManagerVehicle(vehicleId, payload),
    onSuccess: invalidate,
  });
}

export function useRequestDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, payload }) => adminApi.requestDeleteVehicle(vehicleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.vehicles.all() });
      queryClient.invalidateQueries({ queryKey: qk.vehicles.managerRequests() });
    },
  });
}

export function useResetVehicleAccountPassword() {
  return useMutation({
    mutationFn: ({ vehicleId, payload }) => adminApi.resetManagerVehicleAccountPassword(vehicleId, payload),
  });
}
