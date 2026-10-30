import { queryOptions } from '@tanstack/react-query'
import { checkoutApi } from '@/api/endpoints'
import { isApiError } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'

/**
 * Order status. Socket.IO `order.updated` is the primary signal; while pending, a slow poll
 * is a safety net for missed events (the order page also reconciles on reconnection).
 */
export function orderQueryOptions(userId: string, orderId: string) {
  return queryOptions({
    queryKey: queryKeys.private.order(userId, orderId),
    queryFn: ({ signal }) => checkoutApi.order(orderId, signal),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 10_000 : false),
    retry: (count, error) => isApiError(error) && error.retryable && count < 2,
  })
}

export function pendingOrdersQueryOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.private.orders(userId, 'pending'),
    queryFn: ({ signal }) => checkoutApi.orders('pending', signal),
  })
}
