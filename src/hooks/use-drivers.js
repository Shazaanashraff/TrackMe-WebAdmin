import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

export function useManagerDrivers() {
  return useQuery({
    queryKey: qk.drivers.list(),
    queryFn: () => adminApi.getManagerDrivers(),
  });
}

// Only fetched once a category is picked — the list is per category, and an
// unfiltered fetch would be thrown away as soon as one is chosen.
export function useOrganizations(serviceType) {
  return useQuery({
    queryKey: qk.organizations.byServiceType(serviceType),
    queryFn: () => adminApi.getManagerOrganizations(serviceType),
    enabled: Boolean(serviceType),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi.createManagerOrganization(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.organizations.all() }),
  });
}

function useInvalidateDrivers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: qk.drivers.all() });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi.createManagerDriver(payload),
    onSuccess: () => {
      // Creating a driver can take a vehicle off its previous driver, so the
      // vehicle lists go stale alongside the directory.
      queryClient.invalidateQueries({ queryKey: qk.drivers.all() });
      queryClient.invalidateQueries({ queryKey: qk.vehicles.all() });
    },
  });
}

export function useUpdateDriver() {
  const invalidate = useInvalidateDrivers();
  return useMutation({
    mutationFn: ({ driverId, payload }) => adminApi.updateManagerDriver(driverId, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ driverId }) => adminApi.deleteManagerDriver(driverId),
    onSuccess: () => {
      // Deleting a driver can free up a vehicle assignment, so the vehicle
      // lists go stale alongside the directory.
      queryClient.invalidateQueries({ queryKey: qk.drivers.all() });
      queryClient.invalidateQueries({ queryKey: qk.vehicles.all() });
    },
  });
}

export function useResetDriverPassword() {
  return useMutation({
    mutationFn: ({ driverId, password }) => adminApi.resetManagerDriverPassword(driverId, password),
  });
}

// Enrollment keys are fetched on demand rather than with the directory — the
// key is a credential, so it is only pulled once a manager asks to see it.
export function useDriverEnrollmentKey() {
  return useMutation({
    mutationFn: ({ driverId }) => adminApi.getDriverEnrollmentKey(driverId),
  });
}

export function useRotateDriverEnrollmentKey() {
  return useMutation({
    mutationFn: ({ driverId }) => adminApi.rotateDriverEnrollmentKey(driverId),
  });
}
