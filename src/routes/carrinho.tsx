import { createFileRoute, Link } from '@tanstack/react-router'
import { ShoppingCartIcon } from 'lucide-react'
import { cn } from 'cn'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/session'
import { CART_GRID, CartLine } from '@/features/cart/components/CartLine'
import { CartSummary, CartSummarySkeleton } from '@/features/cart/components/CartSummary'
import { useCart } from '@/features/cart/queries'
import { RelatedNfts } from '@/features/nft/components/RelatedNfts'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})

function CartHeader() {
  return (
    <div
      aria-hidden
      className={cn('hidden border-b border-border pb-2 text-sm font-semibold md:grid', CART_GRID)}
    >
      <span>NFTs</span>
      <span>Preço</span>
      <span>Edições</span>
      <span>Total</span>
      <span />
    </div>
  )
}

function CartPage() {
  usePageTitle('Carrinho')
  const { user } = useSession()
  const cart = useCart()
  const items = cart.data?.items ?? []
  const blocked = items.filter(
    (item) => item.status === 'sold-out' || item.status === 'insufficient',
  )
  const blockedReason = blocked.length
    ? 'Ajuste ou remova os itens indisponíveis para finalizar a compra.'
    : null

  const checkoutAction = (
    <Button
      asChild={!blockedReason}
      className="w-full"
      disabled={Boolean(blockedReason)}
      aria-describedby={blockedReason ? 'checkout-blocked' : undefined}
    >
      {blockedReason ? (
        <span>Conectar e finalizar</span>
      ) : user ? (
        <Link to="/pagamento">Conectar e finalizar</Link>
      ) : (
        <Link to="/entrar" search={{ redirect: '/pagamento' }}>
          Conectar e finalizar
        </Link>
      )}
    </Button>
  )

  return (
    <div className="page-container space-y-16 py-8">
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Início', link: { to: '/' } },
            { label: 'Mercado', link: { to: '/mercado' } },
            { label: 'Carrinho' },
          ]}
        />
        <h1 className="sr-only">Carrinho</h1>

        {cart.isError && !cart.data ? (
          <ErrorState
            title="Não foi possível carregar seu carrinho"
            error={cart.error}
            onRetry={() => void cart.refetch()}
            retrying={cart.isFetching}
          />
        ) : cart.data && items.length === 0 ? (
          <Empty className="border border-dashed border-border py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShoppingCartIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle>Seu carrinho está vazio</EmptyTitle>
              <EmptyDescription>
                Explore o mercado e escolha a edição perfeita para a sua coleção.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link to="/mercado">Explorar o mercado</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem] xl:gap-12">
            <section aria-labelledby="cart-items-title" className="space-y-3">
              <h2 id="cart-items-title" className="sr-only">
                Itens do carrinho
              </h2>
              <CartHeader />
              {cart.isPending ? (
                <ul className="space-y-3" aria-label="Carregando itens">
                  {Array.from({ length: 3 }, (_, index) => (
                    <li key={index}>
                      <Skeleton className="h-[4.75rem] w-full rounded-md" />
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => (
                    <CartLine key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </section>
            <aside aria-label="Resumo do pedido">
              {cart.data ? (
                <CartSummary
                  cart={cart.data}
                  updating={cart.isFetching && !cart.isPending}
                  blockedReason={blockedReason}
                  checkoutAction={checkoutAction}
                />
              ) : (
                <CartSummarySkeleton />
              )}
            </aside>
          </div>
        )}
      </div>

      {items[0] && <RelatedNfts nftId={items[0].nftId} title="Colecionadores também viram" />}
    </div>
  )
}
