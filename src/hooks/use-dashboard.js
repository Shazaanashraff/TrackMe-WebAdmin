import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';

/** Super-admin dashboard KPIs + analytics payload. */
export function useSuperAdminDashboard() {
  return useQuery({
    queryKey: qk.dashboard.superAdmin(),
    queryFn: () => adminApi.getSuperAdminDashboard(),
  });
}

/** Manager (org-level) dashboard payload. */
export function useManagerDashboard() {
  return useQuery({
    queryKey: qk.dashboard.manager(),
    queryFn: () => adminApi.getManagerDashboard(),
  });
}
