import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FavoritesResponse, NftSummary } from '@/api/contracts'
import { favoritesApi } from '@/api/endpoints'
import { getErrorMessage } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { useSession } from '@/features/auth/session'

export function favoritesQueryOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.private.favorites(userId),
    queryFn: ({ signal }) => favoritesApi.list(signal),
  })
}

export function useFavorites() {
  const { user } = useSession()
  return useQuery({ ...favoritesQueryOptions(user?.id ?? 'anonymous'), enabled: Boolean(user) })
}

export function useIsFavorite(nftId: string) {
  const { data } = useFavorites()
  return data?.items.some((item) => item.nftId === nftId) ?? false
}

interface ToggleVariables {
  nft: NftSummary
  favorite: boolean
}

/**
 * Optimistic toggle: the heart flips immediately, the previous list is restored if the
 * API fails, and the server state is refetched afterwards. Mutations for the same NFT run
 * in sequence (scope), so fast double clicks keep their order.
 */
export function useToggleFavorite(nftId: string) {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const key = queryKeys.private.favorites(user?.id ?? 'anonymous')

  return useMutation({
    scope: { id: `favorite:${nftId}` },
    mutationFn: ({ nft, favorite }: ToggleVariables) =>
      favorite ? favoritesApi.add(nft.id).then(() => undefined) : favoritesApi.remove(nft.id),
    onMutate: async ({ nft, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoritesResponse>(key)
      queryClient.setQueryData<FavoritesResponse>(key, (data) => {
        const items = (data?.items ?? []).filter((item) => item.nftId !== nft.id)
        return {
          items: favorite
            ? [{ nftId: nft.id, addedAt: new Date().toISOString(), nft }, ...items]
            : items,
        }
      })
      return { previous }
    },
    onError: (error, { favorite }, context) => {
      queryClient.setQueryData(key, context?.previous)
      toast.error(
        `${favorite ? 'Não foi possível favoritar' : 'Não foi possível remover dos favoritos'}. ${getErrorMessage(error)}`,
        { id: `favorite-${nftId}` },
      )
    },
    onSuccess: (_data, { favorite, nft }) => {
      toast.success(
        favorite
          ? `${nft.name} foi adicionado à sua lista de interesse.`
          : `${nft.name} saiu da sua lista de interesse.`,
        { id: `favorite-${nftId}` },
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
