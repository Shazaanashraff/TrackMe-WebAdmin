import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

export function useManagerCustomRoutes(params = {}, options = {}) {
  return useQuery({
    queryKey: qk.routeApprovals.customRoutes(params),
    queryFn: () => adminApi.getManagerCustomRoutes(params),
    ...options,
  });
}

export function useRouteChangeRequests(params = {}, options = {}) {
  return useQuery({
    queryKey: qk.routeApprovals.changeRequests(params),
    queryFn: () => adminApi.getRouteChangeRequests(params),
    ...options,
  });
}

export function useNameCustomRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ routeId, payload }) => adminApi.nameCustomRoute(routeId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-routes'] }),
  });
}

export function useResolveRouteChangeRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => adminApi.resolveRouteChangeRequest(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['route-change-requests'] }),
  });
}
