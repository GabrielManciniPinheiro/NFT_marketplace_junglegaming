import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/errors'

/**
 * Cache, retry and sync policy (documented in ARCHITECTURE.md › Estratégia de cache):
 * - queries are fresh for 30 s, kept for 5 min after the last observer leaves;
 * - only transient failures (network, timeout, 5xx/429 flagged `retryable`) are retried,
 *   twice, with exponential backoff — 4xx answers are final;
 * - mutations are never retried automatically (order creation retries explicitly with the
 *   same Idempotency-Key);
 * - window focus and Socket.IO reconnections trigger refetches of active queries.
 */
export const MAX_QUERY_RETRIES = 2

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) =>
          isApiError(error) && error.retryable && failureCount < MAX_QUERY_RETRIES,
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  })
}
