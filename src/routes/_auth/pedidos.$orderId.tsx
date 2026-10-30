import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { isApiError } from '@/api/errors'
import { ErrorState } from '@/components/common/ErrorState'
import { NotFound } from '@/components/common/NotFound'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/session'
import { OrderView } from '@/features/orders/components/OrderView'
import { orderQueryOptions } from '@/features/orders/queries'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/_auth/pedidos/$orderId')({
  component: OrderPage,
})

const STATUS_TITLE = {
  pending: 'Pedido em processamento',
  confirmed: 'Pedido confirmado',
  declined: 'Pagamento recusado',
}

function OrderPage() {
  const { orderId } = Route.useParams()
  const { user } = useSession()
  const order = useQuery({
    ...orderQueryOptions(user?.id ?? 'anonymous', orderId),
    enabled: Boolean(user),
  })
  usePageTitle(order.data ? STATUS_TITLE[order.data.status] : 'Pedido')

  if (isApiError(order.error) && order.error.is('NOT_FOUND')) {
    return (
      <NotFound
        title="Pedido não encontrado"
        description="Confira o link ou acompanhe seus pedidos pela sua conta."
      />
    )
  }

  return (
    <div className="page-container py-10">
      {order.isPending ? (
        <div className="mx-auto max-w-3xl space-y-6" aria-hidden>
          <Skeleton className="mx-auto size-12 rounded-full" />
          <Skeleton className="mx-auto h-8 w-72" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      ) : order.isError ? (
        <ErrorState
          title={
            isApiError(order.error) && order.error.is('FORBIDDEN')
              ? 'Você não tem acesso a este pedido'
              : 'Não foi possível carregar o pedido'
          }
          error={order.error}
          onRetry={
            isApiError(order.error) && order.error.is('FORBIDDEN')
              ? undefined
              : () => void order.refetch()
          }
          retrying={order.isFetching}
        />
      ) : (
        <OrderView order={order.data} />
      )}
    </div>
  )
}
