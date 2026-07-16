import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

export function useManagerOwnedRoutes() {
  return useQuery({
    queryKey: qk.privateRoutes.owned(),
    queryFn: () => adminApi.getManagerOwnedRoutes(),
  });
}

export function useRouteJoinRequests(routeId, params = {}) {
  return useQuery({
    queryKey: qk.privateRoutes.joinRequests(routeId, params),
    queryFn: () => adminApi.getRouteJoinRequests(routeId, params),
    enabled: Boolean(routeId),
  });
}

export function useRouteMembers(routeId, params = {}) {
  return useQuery({
    queryKey: qk.privateRoutes.members(routeId, params),
    queryFn: () => adminApi.getRouteMembers(routeId, params),
    enabled: Boolean(routeId),
  });
}

export function useUpdateRoutePrivacy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ routeId, payload }) => adminApi.updateRoutePrivacy(routeId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.privateRoutes.owned() }),
  });
}

export function useRevealRoomKey() {
  return useMutation({
    mutationFn: (routeId) => adminApi.revealRoomKey(routeId),
  });
}

export function useRotateRoomKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (routeId) => adminApi.rotateRoomKey(routeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.privateRoutes.owned() }),
  });
}

export function useDecideJoinRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => adminApi.decideJoinRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route'] });
      queryClient.invalidateQueries({ queryKey: qk.privateRoutes.owned() });
    },
  });
}

export function useRevokeRouteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ routeId, userId }) => adminApi.revokeRouteMember(routeId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route'] });
      queryClient.invalidateQueries({ queryKey: qk.privateRoutes.owned() });
    },
  });
}
