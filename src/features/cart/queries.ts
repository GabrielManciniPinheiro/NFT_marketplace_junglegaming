import { queryOptions, useQuery } from '@tanstack/react-query'
import { credentials } from '@/api/credentials'
import { cartApi } from '@/api/endpoints'
import { cartKey } from '@/api/query-keys'
import { useSession } from '@/features/auth/session'

/**
 * The cart lives on the server for visitors too: the guest cart id travels in
 * `X-Guest-Cart` and is merged into the account cart on login/register.
 */
export function cartQueryOptions(userId: string | null) {
  return queryOptions({
    queryKey: cartKey(userId),
    queryFn: async ({ signal }) => {
      const cart = await cartApi.get(signal)
      if (cart.owner === 'guest' && cart.id && cart.id !== credentials.getGuestCartId()) {
        credentials.setGuestCartId(cart.id)
      }
      return cart
    },
    staleTime: 15_000,
  })
}

/** Cart of the current owner; waits for the session check so a user never sees a guest cart. */
export function useCart() {
  const { user, isResolving } = useSession()
  return useQuery({ ...cartQueryOptions(user?.id ?? null), enabled: !isResolving })
}
