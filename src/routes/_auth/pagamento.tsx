import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronLeftIcon, ShoppingCartIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { Collector, User, WalletProvider, WalletSession } from '@/api/contracts'
import { checkoutApi } from '@/api/endpoints'
import { getErrorMessage } from '@/api/errors'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { ErrorState } from '@/components/common/ErrorState'
import { FormAlert } from '@/components/form/FormAlert'
import { FormField } from '@/components/form/FormField'
import { applyServerErrors } from '@/components/form/server-errors'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { WalletFields } from '@/features/account/components/WalletFields'
import { useWallets } from '@/features/account/queries'
import { useSession } from '@/features/auth/session'
import { useCart } from '@/features/cart/queries'
import {
  COLLECTOR_FIELDS,
  collectorDefaults,
  collectorResolver,
  type CollectorFormValues,
} from '@/features/checkout/collector'
import { OrderLines, OrderTotals } from '@/features/checkout/components/OrderLines'
import { ReviewDialog } from '@/features/checkout/components/ReviewDialog'
import { WalletPicker } from '@/features/checkout/components/WalletPicker'
import { useDisconnectWallet } from '@/features/checkout/mutations'
import { checkoutDraft, orderAttempt, walletSessionDraft } from '@/features/checkout/storage'
import { pendingOrdersQueryOptions } from '@/features/orders/queries'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/_auth/pagamento')({
  component: CheckoutPage,
})

function CheckoutPage() {
  usePageTitle('Pagamento')
  const { user } = useSession()
  // The route guard guarantees a user; an expiry mid-page is handled by SessionManager.
  return user ? <Checkout user={user} /> : null
}

function PendingOrderNotice({ userId }: { userId: string }) {
  const pending = useQuery(pendingOrdersQueryOptions(userId))
  const order = pending.data?.items[0]
  if (!order) return null
  return (
    <FormAlert tone="info">
      Você tem um pedido em processamento ({order.number}).{' '}
      <Link
        to="/pedidos/$orderId"
        params={{ orderId: order.id }}
        className="font-semibold text-brand underline"
      >
        Acompanhar status
      </Link>
    </FormAlert>
  )
}

/** A previous submission whose answer never arrived (refresh or timeout): resend the same attempt. */
function UnconfirmedAttemptNotice({ userId }: { userId: string }) {
  const navigate = Route.useNavigate()
  const [attempt, setAttempt] = useState(() => orderAttempt.pending(userId))
  const [checking, setChecking] = useState(false)
  if (!attempt) return null

  const check = async () => {
    setChecking(true)
    try {
      const order = await checkoutApi.createOrder(attempt.body, attempt.key)
      orderAttempt.clear(userId)
      void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } })
    } catch (error) {
      toast.error(`Não foi possível recuperar a tentativa anterior. ${getErrorMessage(error)}`)
      orderAttempt.clear(userId)
      setAttempt(null)
    } finally {
      setChecking(false)
    }
  }

  return (
    <FormAlert tone="info">
      Encontramos uma tentativa de compra sem confirmação. Verifique o status antes de comprar
      novamente — o reenvio usa a mesma tentativa e não duplica o pedido.{' '}
      <Button
        variant="link"
        size="xs"
        className="h-auto p-0 text-sm"
        onClick={() => void check()}
        disabled={checking}
      >
        {checking ? 'Verificando…' : 'Verificar tentativa'}
      </Button>
    </FormAlert>
  )
}

function Checkout({ user }: { user: User }) {
  const cart = useCart()
  const walletsQuery = useWallets()
  const disconnect = useDisconnectWallet()
  const wallets = [walletsQuery.data?.primary, walletsQuery.data?.secondary].filter(
    (wallet) => wallet != null,
  )

  const [walletId, setWalletId] = useState<string | null>(null)
  const selectedWallet = wallets.find((wallet) => wallet.id === walletId) ?? wallets[0] ?? null
  const [provider, setProvider] = useState<WalletProvider | null>(null)
  const effectiveProvider: WalletProvider = provider ?? selectedWallet?.provider ?? 'metamask'
  const [connection, setConnection] = useState<WalletSession | null>(() =>
    walletSessionDraft.load(user.id),
  )
  const [reviewing, setReviewing] = useState<Collector | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  const [draft] = useState(() => checkoutDraft.load<CollectorFormValues>(user.id))
  const form = useForm<CollectorFormValues, unknown, Collector>({
    resolver: collectorResolver,
    defaultValues: draft ?? collectorDefaults(user, null),
    mode: 'onTouched',
  })

  // Without a saved draft, the registered wallet fills the profile once it loads.
  const walletsLoaded = Boolean(walletsQuery.data)
  useEffect(() => {
    if (walletsLoaded && !draft && !form.formState.isDirty) {
      form.reset(collectorDefaults(user, selectedWallet))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the wallets arrive
  }, [walletsLoaded])

  // Draft survives refreshes and session expiry (cleared on logout and after ordering).
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ values }) => checkoutDraft.save(user.id, values),
      }),
    [form, user.id],
  )

  const selectWallet = (id: string) => {
    const wallet = wallets.find((item) => item.id === id) ?? null
    setWalletId(id)
    setProvider(null)
    form.reset({
      ...collectorDefaults(user, wallet),
      username: form.getValues('username'),
      note: form.getValues('note'),
    })
  }

  const updateConnection = (session: WalletSession | null) => {
    setConnection(session)
    if (session) walletSessionDraft.save(user.id, session)
    else walletSessionDraft.clear(user.id)
  }

  const activeConnection =
    connection && selectedWallet && connection.walletId === selectedWallet.id ? connection : null

  const items = cart.data?.items ?? []
  const blocked = items.some((item) => item.status === 'sold-out' || item.status === 'insufficient')
  const errors = form.formState.errors

  const openReview = form.handleSubmit((values) => {
    setReviewing(values)
    setReviewOpen(true)
  })

  return (
    <div className="page-container py-8">
      <div className="mb-6 hidden md:block">
        <Breadcrumbs
          items={[
            { label: 'Início', link: { to: '/' } },
            { label: 'Mercado', link: { to: '/mercado' } },
            { label: 'Pagamento' },
          ]}
        />
      </div>
      <div className="mb-6 flex items-center gap-3 md:hidden">
        <Button asChild variant="secondary" size="icon-sm" className="rounded-full">
          <Link to="/carrinho" aria-label="Voltar ao carrinho">
            <ChevronLeftIcon className="text-brand" aria-hidden />
          </Link>
        </Button>
        <span aria-hidden className="text-lg font-bold">
          Pagamento com carteira
        </span>
      </div>
      <h1 className="sr-only">Pagamento com carteira</h1>

      <div className="mb-6 space-y-3 empty:hidden">
        <PendingOrderNotice userId={user.id} />
        <UnconfirmedAttemptNotice userId={user.id} />
      </div>

      {cart.isError && !cart.data ? (
        <ErrorState
          title="Não foi possível carregar seu carrinho"
          error={cart.error}
          onRetry={() => void cart.refetch()}
        />
      ) : cart.data && items.length === 0 ? (
        <Empty className="border border-dashed border-border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingCartIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Não há itens para pagar</EmptyTitle>
            <EmptyDescription>
              Adicione NFTs ao carrinho para finalizar uma compra.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/mercado">Explorar o mercado</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <form
          noValidate
          onSubmit={openReview}
          className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-14"
        >
          <section aria-labelledby="collector-title" className="space-y-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="collector-title" className="text-[0.9375rem] font-bold">
                Perfil do colecionador
              </h2>
              <p className="text-xs text-meta">
                <span aria-hidden className="text-required">
                  *
                </span>{' '}
                Campos obrigatórios
              </p>
            </div>
            {errors.root?.server && <FormAlert>{errors.root.server.message}</FormAlert>}
            {walletsQuery.isPending ? (
              <div className="grid gap-5 sm:grid-cols-2" aria-hidden>
                {Array.from({ length: 10 }, (_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <>
                <WalletFields
                  form={form}
                  idPrefix="collector"
                  companion={
                    <FormField
                      id="collector-username"
                      label="Nome de usuário"
                      required
                      error={errors.username?.message}
                    >
                      {(control) => (
                        <Input
                          {...control}
                          {...form.register('username')}
                          autoComplete="username"
                        />
                      )}
                    </FormField>
                  }
                />
                <FormField
                  id="collector-note"
                  label="Observação do colecionador (opcional)"
                  error={errors.note?.message}
                  className="sm:w-1/2 sm:pr-2.5"
                >
                  {(control) => (
                    <Textarea
                      {...control}
                      {...form.register('note')}
                      rows={5}
                      className="resize-y"
                    />
                  )}
                </FormField>
              </>
            )}
          </section>

          <aside aria-label="Resumo e pagamento" className="space-y-6">
            <section aria-labelledby="checkout-items-title" className="space-y-4">
              <h2 id="checkout-items-title" className="text-[0.9375rem] font-bold">
                Seus NFTs
              </h2>
              {cart.data ? (
                <>
                  <OrderLines lines={items} />
                  <p className="text-center text-sm text-sand">
                    Tem um código promocional?{' '}
                    <Link to="/carrinho" className="text-brand hover:underline">
                      Aplique aqui
                    </Link>
                  </p>
                  <OrderTotals
                    {...cart.data.summary}
                    coupon={cart.data.coupon}
                    feeNote="Taxa estimada"
                  />
                </>
              ) : (
                <div className="space-y-2" aria-hidden>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              )}
            </section>

            <WalletPicker
              wallets={wallets}
              walletId={selectedWallet?.id ?? null}
              onWalletChange={selectWallet}
              provider={effectiveProvider}
              onProviderChange={setProvider}
              connection={activeConnection}
              disconnecting={disconnect.isPending}
              onDisconnect={() => {
                if (!activeConnection) return
                disconnect.mutate(activeConnection.id, {
                  onSettled: () => {
                    updateConnection(null)
                    toast.info('Carteira desconectada.')
                  },
                })
              }}
            />

            {blocked && (
              <FormAlert>
                Há itens indisponíveis no carrinho.{' '}
                <Link to="/carrinho" className="font-semibold text-brand underline">
                  Ajustar carrinho
                </Link>
              </FormAlert>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-full bg-gradient-to-r from-primary to-[#b8773f] md:rounded-md md:bg-none"
              disabled={!cart.data || blocked || walletsQuery.isPending}
            >
              Confirmar compra
            </Button>
          </aside>
        </form>
      )}

      {reviewing && (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          user={user}
          collector={reviewing}
          wallet={selectedWallet}
          provider={effectiveProvider}
          cart={cart.data}
          connection={activeConnection}
          onConnection={updateConnection}
          onFieldErrors={(error) =>
            applyServerErrors(form, error, COLLECTOR_FIELDS, { stripPrefix: 'collector.' })
          }
        />
      )}
    </div>
  )
}
