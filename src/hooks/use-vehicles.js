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

export function useManagerAssignableRoutes() {
  return useQuery({
    queryKey: qk.vehicles.assignableRoutes(),
    queryFn: () => adminApi.getManagerAssignableRoutes(),
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

export function useCreateVehicleAccountRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi.createVehicleAccountRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.vehicles.all() });
      queryClient.invalidateQueries({ queryKey: qk.vehicles.managerRequests() });
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
