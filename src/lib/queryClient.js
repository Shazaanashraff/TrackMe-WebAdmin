import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client for the admin portal.
 *
 * Data flows: component → query/mutation hook (src/hooks/*) → adminApi (src/api.js).
 * adminApi already handles auth headers, 401/403 refresh-and-retry, and redirect, and
 * throws an Error on failure — which Query surfaces as `error`. Never call `fetch` or
 * `adminApi` directly from a component.
 *
 * `gcTime` is a full day on purpose: nothing is persisted to disk here, so it only
 * governs how long an unmounted query stays in memory. A short window meant every
 * move between tabs threw the previous page's data away and reopened on a spinner.
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
