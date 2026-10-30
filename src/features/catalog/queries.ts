import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { NftListQuery } from '@/api/contracts'
import { nftsApi } from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'
import { preloadImage } from '@/lib/preload-image'

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

/** `sizes` of the hero artwork (kept in sync with Hero.tsx). */
export const HERO_IMAGE_SIZES = '(min-width: 768px) 448px, calc(100vw - 2rem)'

export function highlightsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.nfts.highlights(),
    queryFn: async ({ signal }) => {
      const highlights = await nftsApi.highlights(signal)
      if (highlights.hero[0]) preloadImage(highlights.hero[0].image, HERO_IMAGE_SIZES)
      return highlights
    },
    staleTime: 60_000,
  })
}
