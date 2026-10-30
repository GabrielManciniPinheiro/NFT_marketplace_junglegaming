import { queryOptions } from '@tanstack/react-query'
import { nftsApi } from '@/api/endpoints'
import { isApiError } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'

export function nftDetailQueryOptions(nftId: string) {
  return queryOptions({
    queryKey: queryKeys.nfts.detail(nftId),
    queryFn: ({ signal }) => nftsApi.detail(nftId, signal),
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
