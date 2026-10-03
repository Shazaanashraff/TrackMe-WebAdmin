import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

export function useAppReleases() {
  return useQuery({
    queryKey: qk.appReleases.list(),
    queryFn: () => adminApi.getAppReleases(),
  });
}

export function useAppReleaseHistory(app) {
  return useQuery({
    queryKey: qk.appReleases.history(app),
    queryFn: () => adminApi.getAppReleaseHistory(app),
    enabled: Boolean(app),
  });
}

function useInvalidateAppReleases() {
  const queryClient = useQueryClient();
  return (app) => {
    queryClient.invalidateQueries({ queryKey: qk.appReleases.all() });
    if (app) {
      queryClient.invalidateQueries({ queryKey: qk.appReleases.history(app) });
    }
  };
}

export function useCreateAppRelease() {
  const invalidate = useInvalidateAppReleases();
  return useMutation({
    mutationFn: (payload) => adminApi.createAppRelease(payload),
    onSuccess: (_data, payload) => invalidate(payload?.app),
  });
}

export function useUpdateAppReleaseStatus() {
  const invalidate = useInvalidateAppReleases();
  return useMutation({
    mutationFn: ({ id, isActive, app }) => adminApi.updateAppReleaseStatus(id, isActive).then((res) => ({ ...res, app })),
    onSuccess: (_data, variables) => invalidate(variables?.app),
  });
}
