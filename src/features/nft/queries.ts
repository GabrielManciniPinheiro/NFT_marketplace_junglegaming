import { queryOptions } from '@tanstack/react-query'
import { nftsApi } from '@/api/endpoints'
import { isApiError } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { preloadImage } from '@/lib/preload-image'

/** `sizes` of the main detail artwork (kept in sync with Gallery.tsx). */
export const DETAIL_IMAGE_SIZES =
  '(min-width: 1024px) 440px, (min-width: 640px) 60vw, calc(100vw - 2rem)'

export function nftDetailQueryOptions(nftId: string) {
  return queryOptions({
    queryKey: queryKeys.nfts.detail(nftId),
    queryFn: async ({ signal }) => {
      const detail = await nftsApi.detail(nftId, signal)
      if (detail.gallery[0]) preloadImage(detail.gallery[0], DETAIL_IMAGE_SIZES)
      return detail
    },
    // A missing NFT is a final answer, not a transient failure.
    retry: (count, error) => isApiError(error) && error.retryable && count < 2,
  })
}

export function relatedNftsQueryOptions(nftId: string) {
  return queryOptions({
    queryKey: queryKeys.nfts.related(nftId),
    queryFn: ({ signal }) => nftsApi.related(nftId, signal),
    staleTime: 60_000,
  })
}
