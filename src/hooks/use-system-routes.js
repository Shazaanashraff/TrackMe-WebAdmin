import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

export function useSystemRoutes(params = {}) {
  return useQuery({
    queryKey: qk.systemRoutes.list(params),
    queryFn: () => adminApi.getSystemRoutes(params),
  });
}

export function useCreateSystemRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi.createSystemRoute(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.systemRoutes.all() }),
  });
}
