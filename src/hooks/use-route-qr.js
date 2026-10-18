import { useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';
import { useManagerAssignableRoutes } from '@/hooks/use-vehicles';

// GET /api/manager/routes also lists public routes and leaves out `managerId`
// and `qrEnabled`, so each route's own document says whether this manager owns
// it and where its QR switch stands. Only the owner may change the switch.
export function useOwnRouteQr(managerId) {
  const listQ = useManagerAssignableRoutes({ enabled: Boolean(managerId) });
  const routeIds = (listQ.data?.data || []).map((route) => route.routeId);
  const detailQs = useQueries({
    queries: routeIds.map((routeId) => ({
      queryKey: qk.routeDetail(routeId),
      queryFn: () => adminApi.getRoute(routeId),
    })),
  });

  const routes = detailQs
    .map((q) => q.data?.data)
    .filter((route) => route && managerId && String(route.managerId) === String(managerId));

  return {
    routes,
    isLoading: listQ.isLoading || detailQs.some((q) => q.isLoading),
    isError: listQ.isError || detailQs.some((q) => q.isError),
  };
}

export function useSetRouteQr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ routeId, qrEnabled }) => adminApi.setManagerRouteQr(routeId, qrEnabled),
    onSuccess: (res, { routeId, qrEnabled }) => {
      const saved = res?.data?.qrEnabled ?? qrEnabled;
      queryClient.setQueryData(qk.routeDetail(routeId), (old) =>
        old?.data ? { ...old, data: { ...old.data, qrEnabled: saved } } : old
      );
    },
  });
}
