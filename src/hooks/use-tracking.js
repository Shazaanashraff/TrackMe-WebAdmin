import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

/**
 * Recent GPS history for one vehicle. Live position updates arrive over socket.io
 * inside ManagerTrackingPage; this query seeds the initial track and the
 * history-window fallback. `minutes` is the look-back window (15/30/60).
 */
export function useManagerVehicleLocation(vehicleId, minutes = 15) {
  return useQuery({
    queryKey: qk.vehicles.location(vehicleId, minutes),
    queryFn: () => adminApi.getManagerVehicleLocation(vehicleId, minutes),
    enabled: Boolean(vehicleId),
    staleTime: 0,
  });
}
