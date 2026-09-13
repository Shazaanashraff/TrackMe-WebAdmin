import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

// The route catalogue changes a few times a month, not every 30 seconds. A
// long staleTime stops every page visit triggering a background refetch; the
// mutations below still invalidate it the instant a route actually changes.
export const ROUTES_STALE_TIME = 15 * 60 * 1000;

export function useSystemRoutes(params = {}) {
  return useQuery({
    queryKey: qk.systemRoutes.list(params),
    queryFn: () => adminApi.getSystemRoutes(params),
    staleTime: ROUTES_STALE_TIME,
  });
}

export function useCreateSystemRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi.createSystemRoute(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.systemRoutes.all() }),
  });
}

export function useUpdateSystemRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ routeId, payload }) => adminApi.updateSystemRoute(routeId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.systemRoutes.all() }),
  });
}

export function useToggleSystemRouteStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ routeId }) => adminApi.toggleSystemRouteStatus(routeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.systemRoutes.all() }),
  });
}

export function useDeleteSystemRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ routeId }) => adminApi.deleteSystemRoute(routeId),
    onSuccess: () => {
      // Deleting a route unassigns any vehicle still pointed at it, so the
      // vehicle lists go stale too (mirrors useDeleteManager's invalidation).
      queryClient.invalidateQueries({ queryKey: qk.systemRoutes.all() });
      queryClient.invalidateQueries({ queryKey: qk.vehicles.all() });
    },
  });
}
