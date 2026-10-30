import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AddCartItemRequest, Cart, UpdateCartItemRequest } from '@/api/contracts'
import { credentials } from '@/api/credentials'
import { cartApi } from '@/api/endpoints'
import { isApiError } from '@/api/errors'
import { cartKey, queryKeys } from '@/api/query-keys'
import { useSession } from '@/features/auth/session'

/** Every cart mutation answers with the full cart: the cache is replaced, not refetched. */
function useCartCache() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const key = cartKey(user?.id ?? null)

  return {
    key,
    queryClient,
    store(cart: Cart) {
      if (cart.owner === 'guest') credentials.setGuestCartId(cart.id)
      queryClient.setQueryData(key, cart)
    },
    /** Availability conflicts mean our catalog data is stale too. */
    refreshCatalog(error: unknown, nftId?: string) {
      if (isApiError(error) && error.is('AVAILABILITY_CONFLICT', 'NOT_FOUND')) {
        void queryClient.invalidateQueries({ queryKey: key })
        if (nftId) void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.detail(nftId) })
      }
    },
  }
}

export function useAddToCart() {
  const cache = useCartCache()
  return useMutation({
    mutationFn: (body: AddCartItemRequest) => cartApi.addItem(body),
    onSuccess: (cart) => cache.store(cart),
    onError: (error, body) => cache.refreshCatalog(error, body.nftId),
  })
}

export function useUpdateCartItem() {
  const cache = useCartCache()
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: UpdateCartItemRequest }) =>
      cartApi.updateItem(itemId, body),
    onSuccess: (cart) => cache.store(cart),
    onError: (error) => cache.refreshCatalog(error),
  })
}

export function useRemoveCartItem() {
  const cache = useCartCache()
  return useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onSuccess: (cart) => cache.store(cart),
    onError: (error) => cache.refreshCatalog(error),
  })
}

export function useApplyCoupon() {
  const cache = useCartCache()
  return useMutation({
    mutationFn: (code: string) => cartApi.applyCoupon(code),
    onSuccess: (cart) => cache.store(cart),
  })
}

export function useRemoveCoupon() {
  const cache = useCartCache()
  return useMutation({
    mutationFn: () => cartApi.removeCoupon(),
    onSuccess: (cart) => cache.store(cart),
  })
}
