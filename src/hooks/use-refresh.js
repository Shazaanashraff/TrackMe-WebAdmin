import { useQueryClient } from '@tanstack/react-query';

/** Returns a function that invalidates all active TanStack Query caches. Used by the Topbar refresh control. */
export function useRefreshData() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}
