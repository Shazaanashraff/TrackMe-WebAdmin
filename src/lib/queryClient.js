import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

/**
 * Shared TanStack Query client for the admin portal.
 *
 * Data flows: component → query/mutation hook (src/hooks/*) → adminApi (src/api.js).
 * adminApi already handles auth headers, 401/403 refresh-and-retry, and redirect, and
 * throws an Error on failure — which Query surfaces as `error`. Never call `fetch` or
 * `adminApi` directly from a component.
 *
 * `gcTime` is a full day on purpose: it governs how long an unmounted query stays
 * around, on disk as well as in memory now that a persister is wired up (see below).
 * A short window meant every move between tabs threw the previous page's data away
 * and reopened on a spinner; a browser refresh was a full cold start every time.
 * `offlineFirst` lets a request be attempted rather than withheld when the browser
 * reports itself offline; mutations keep `retry: 0`, so a genuinely failed write
 * surfaces its error immediately instead of sitting paused.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
});

/**
 * Live vehicle-position data must never reach disk — a saved bus position is a lie
 * the moment it's read back. `qk.vehicles.managerLive()` (['vehicles','manager','live'])
 * is the only query key in this app that carries live data (see src/lib/queryKeys.js);
 * this predicate excludes it and anything shaped like it by checking for a literal
 * 'live' key segment, so a future live feature has to deliberately opt out of
 * persistence rather than silently opting in.
 */
export function isLiveQueryKey(queryKey) {
  return Array.isArray(queryKey) && queryKey.some((part) => part === 'live');
}

export function shouldDehydrateQuery(query) {
  // Don't persist a failed query — that would cache an error, not data.
  if (query.state.status !== 'success') return false;
  if (isLiveQueryKey(query.queryKey)) return false;
  return true;
}

const PERSIST_STORAGE_KEY = 'trackme-admin-query-cache';

// Bump this if a persisted shape ever becomes incompatible with the code reading
// it — changing it drops every existing persisted cache on next load. Don't
// version the storage key itself (see authSession.js's stable STORAGE_KEY for the
// same pattern applied to auth) so an app deploy doesn't orphan old entries.
export const PERSIST_SCHEMA_VERSION = '1';

export const persister =
  typeof window !== 'undefined'
    ? createSyncStoragePersister({ storage: window.localStorage, key: PERSIST_STORAGE_KEY })
    : undefined;

export const persistOptions = {
  persister,
  buster: PERSIST_SCHEMA_VERSION,
  dehydrateOptions: { shouldDehydrateQuery },
};

/**
 * Wipes both the in-memory cache and whatever's on disk. Must run on every logout
 * (and would need to run on an account switch too, if this app ever grows one) —
 * otherwise the next manager to sign in on this browser can briefly see the
 * previous manager's cached rows before their own fetches land.
 */
export function clearPersistedQueryCache() {
  queryClient.clear();
  persister?.removeClient();
}
