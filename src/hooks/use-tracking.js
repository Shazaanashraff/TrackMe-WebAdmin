import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

/**
 * Recent GPS history for one bus. Live position updates arrive over socket.io
 * inside ManagerTrackingPage; this query seeds the initial track and the
 * history-window fallback. `minutes` is the look-back window (15/30/60).
 */
export function useManagerBusLocation(busId, minutes = 15) {
  return useQuery({
    queryKey: qk.buses.location(busId, minutes),
    queryFn: () => adminApi.getManagerBusLocation(busId, minutes),
    enabled: Boolean(busId),
    staleTime: 0,
  });
}
