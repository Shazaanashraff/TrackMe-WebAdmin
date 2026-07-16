import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client for the admin portal.
 *
 * Data flows: component → query/mutation hook (src/hooks/*) → adminApi (src/api.js).
 * adminApi already handles auth headers, 401/403 refresh-and-retry, and redirect, and
 * throws an Error on failure — which Query surfaces as `error`. Never call `fetch` or
 * `adminApi` directly from a component.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
