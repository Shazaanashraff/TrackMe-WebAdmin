import { useQueryClient } from '@tanstack/react-query';

/**
 * Returns a function that refetches all active queries. Used by the Topbar
 * refresh control. During the MUI→hooks migration this runs alongside the
 * legacy `refreshSignal` counter so both un-migrated (manual load) and
 * migrated (useQuery) pages refresh from one control.
 */
export function useRefreshData() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}
