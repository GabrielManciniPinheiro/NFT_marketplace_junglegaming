import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { NftListQuery } from '@/api/contracts'
import { nftsApi } from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'

/**
 * Catalog list keyed by the exact API query: each combination of filters has its own cache
 * entry, and the AbortSignal cancels requests whose parameters are no longer on screen, so
 * an out-of-order response can never overwrite newer results.
 */
export function nftListQueryOptions(query: NftListQuery) {
  return queryOptions({
    queryKey: queryKeys.nfts.list(query),
    queryFn: ({ signal }) => nftsApi.list(query, signal),
    placeholderData: keepPreviousData,
  })
}

export function highlightsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.nfts.highlights(),
    queryFn: ({ signal }) => nftsApi.highlights(signal),
    staleTime: 60_000,
  })
}
