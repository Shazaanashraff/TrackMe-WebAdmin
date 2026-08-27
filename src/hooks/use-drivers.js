import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

export function useManagerDrivers() {
  return useQuery({
    queryKey: qk.drivers.list(),
    queryFn: () => adminApi.getManagerDrivers(),
  });
}

// Only fetched once a category is picked. The list is per category, so an
// unfiltered fetch would be thrown away as soon as one is chosen. Organizations
// barely change, so an hour of staleness keeps the create/edit dialog from
// refetching the dropdown every time it opens.
export const ORGANIZATIONS_STALE_TIME = 60 * 60 * 1000;

export function useOrganizations(serviceType) {
  return useQuery({
    queryKey: qk.organizations.byServiceType(serviceType),
    queryFn: () => adminApi.getManagerOrganizations(serviceType),
    enabled: Boolean(serviceType),
    staleTime: ORGANIZATIONS_STALE_TIME,
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

// A mutation, not a query, despite being a GET: the server audit-logs every
// read (`DRIVER_PASSWORD_VIEWED`), so it must fire exactly when the manager
// asks and never be cached, retried, or refetched in the background.
export function useDriverPassword() {
  return useMutation({
    mutationFn: ({ driverId }) => adminApi.getManagerDriverPassword(driverId),
  });
}

// The enrollment key is a credential, fetched only when the manager clicks
// "Show key" (`enabled` flips true then). Unlike the password read, this GET is
// NOT audit-logged server-side, so it can safely be a cached query — which is
// what lets a key the manager already opened stay readable through a brief
// disconnect. It is still kept off disk: src/lib/queryClient.js's
// `isCredentialQueryKey` excludes this key from the localStorage persister, so
// a plaintext key is never written to storage.
export function useDriverEnrollmentKey(driverId, { enabled = false } = {}) {
  return useQuery({
    queryKey: qk.drivers.enrollmentKey(driverId),
    queryFn: () => adminApi.getDriverEnrollmentKey(driverId),
    enabled: enabled && Boolean(driverId),
    // The key only changes via an explicit rotate/revert on this same page, and
    // those write the new value straight into this cache entry (below). Nothing
    // else moves it, so there is no reason to background-refetch a credential.
    staleTime: Infinity,
    // Let a revealed key fall out of memory within a shift rather than lingering
    // for the app-wide 24h gcTime default.
    gcTime: 15 * 60 * 1000,
    retry: 0,
  });
}

// Rotate / revert stay mutations — real POSTs with server-side effects — but on
// success they push the new key straight into the reveal query's cache, so the
// row updates without a refetch and a later offline read gets the current key.
export function useRotateDriverEnrollmentKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ driverId }) => adminApi.rotateDriverEnrollmentKey(driverId),
    onSuccess: (res, { driverId }) =>
      queryClient.setQueryData(qk.drivers.enrollmentKey(driverId), res),
  });
}

export function useRevertDriverEnrollmentKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ driverId }) => adminApi.revertDriverEnrollmentKey(driverId),
    onSuccess: (res, { driverId }) =>
      queryClient.setQueryData(qk.drivers.enrollmentKey(driverId), res),
  });
}
