import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ConnectWalletRequest,
  CreateOrderRequest,
  CreateQuoteRequest,
  CreateWalletRequest,
} from '@/api/contracts'
import { checkoutApi, walletsApi } from '@/api/endpoints'
import { cartKey, queryKeys } from '@/api/query-keys'

export function useCreateQuote(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateQuoteRequest) => checkoutApi.quote(body),
    // The quote acknowledges prices server-side: bring the cart cache to the same version.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cartKey(userId) }),
  })
}

export function useConnectWallet() {
  return useMutation({ mutationFn: (body: ConnectWalletRequest) => walletsApi.connect(body) })
}

export function useDisconnectWallet() {
  return useMutation({ mutationFn: (sessionId: string) => walletsApi.disconnect(sessionId) })
}

export function useCreateWallet(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateWalletRequest) => walletsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.private.wallets(userId) }),
  })
}

/** Never retried automatically: retries are explicit and reuse the same Idempotency-Key. */
export function useCreateOrder(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: CreateOrderRequest; idempotencyKey: string }) =>
      checkoutApi.createOrder(body, idempotencyKey),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.private.order(userId, order.id), order)
      void queryClient.invalidateQueries({ queryKey: ['private', userId, 'orders', 'list'] })
      void queryClient.invalidateQueries({ queryKey: cartKey(userId) })
    },
  })
}
