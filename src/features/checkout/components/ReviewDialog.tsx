import { Link, useNavigate } from '@tanstack/react-router'
import { RefreshCwIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  NETWORK_LABEL,
  WALLET_PROVIDER_LABEL,
  quoteChangedSchema,
  type Cart,
  type Collector,
  type CreateOrderRequest,
  type Quote,
  type QuoteChange,
  type User,
  type Wallet,
  type WalletProvider,
  type WalletSession,
} from '@/api/contracts'
import { getErrorMessage, isApiError } from '@/api/errors'
import { FormAlert } from '@/components/form/FormAlert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { formatEth } from '@/lib/eth'
import { formatDateTime, shortAddress } from '@/lib/format'
import { useConnectWallet, useCreateOrder, useCreateQuote, useCreateWallet } from '../mutations'
import { checkoutDraft, orderAttempt } from '../storage'
import { OrderLines, OrderTotals } from './OrderLines'

type Phase =
  | { kind: 'quoting' }
  | { kind: 'ready' }
  | { kind: 'saving-wallet' }
  | { kind: 'connecting' }
  | { kind: 'submitting' }
  | { kind: 'changed'; changes: QuoteChange[]; next: Quote }
  | { kind: 'error'; message: string; retry: 'quote' | 'pay' | null; toCart?: boolean }

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
  collector: Collector
  wallet: Wallet | null
  provider: WalletProvider
  cart: Cart | undefined
  connection: WalletSession | null
  onConnection: (session: WalletSession | null) => void
  /** Field-level API errors are shown on the form behind the dialog. */
  onFieldErrors: (error: unknown) => void
}

const BUSY: Phase['kind'][] = ['quoting', 'saving-wallet', 'connecting', 'submitting']

export function ReviewDialog({
  open,
  onOpenChange,
  user,
  collector,
  wallet,
  provider,
  cart,
  connection,
  onConnection,
  onFieldErrors,
}: ReviewDialogProps) {
  const navigate = useNavigate()
  const createQuote = useCreateQuote(user.id)
  const createWallet = useCreateWallet(user.id)
  const connect = useConnectWallet()
  const createOrder = useCreateOrder(user.id)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'quoting' })
  const requested = useRef(false)

  const requestQuote = () => {
    setPhase({ kind: 'quoting' })
    createQuote.mutate(
      { network: collector.network },
      {
        onSuccess: (fresh) => {
          setQuote(fresh)
          setPhase({ kind: 'ready' })
        },
        onError: (error) =>
          setPhase({
            kind: 'error',
            message: getErrorMessage(error),
            retry: isApiError(error) && error.is('AVAILABILITY_CONFLICT') ? null : 'quote',
            toCart: isApiError(error) && error.is('AVAILABILITY_CONFLICT', 'VALIDATION_FAILED'),
          }),
      },
    )
  }

  // A fresh quote every time the dialog opens: prices, coupon and fees are revalidated.
  useEffect(() => {
    if (open && !requested.current) {
      requested.current = true
      requestQuote()
    }
    if (!open) requested.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on open transitions only
  }, [open])

  // A newer cart version (nft.updated, edits in another tab) makes this quote stale.
  const outdated =
    Boolean(quote && cart && cart.version > quote.cartVersion) && phase.kind === 'ready'
  const busy = BUSY.includes(phase.kind)

  function handleFailure(error: unknown) {
    if (!isApiError(error)) {
      setPhase({ kind: 'error', message: getErrorMessage(error), retry: 'pay' })
      return
    }
    if (error.is('QUOTE_CHANGED')) {
      const parsed = quoteChangedSchema.safeParse(error.details)
      if (parsed.success) {
        setPhase({ kind: 'changed', changes: parsed.data.changes, next: parsed.data.quote })
        return
      }
    }
    if (error.is('WALLET_REJECTED')) {
      setPhase({ kind: 'error', message: error.message, retry: 'pay' })
      return
    }
    if (error.is('AVAILABILITY_CONFLICT')) {
      setPhase({ kind: 'error', message: error.message, retry: null, toCart: true })
      return
    }
    const reason = (error.details as { reason?: string; orderId?: string } | undefined) ?? {}
    if (error.is('CONFLICT') && reason.reason === 'pending-order' && reason.orderId) {
      onOpenChange(false)
      toast.info('Você já tem um pedido em processamento. Acompanhe o status abaixo.')
      void navigate({ to: '/pedidos/$orderId', params: { orderId: reason.orderId } })
      return
    }
    if (error.is('CONFLICT') && reason.reason === 'wallet-disconnected') {
      onConnection(null)
      setPhase({ kind: 'error', message: error.message, retry: 'pay' })
      return
    }
    if (error.is('VALIDATION_FAILED') && Object.keys(error.fieldErrors).length) {
      onOpenChange(false)
      onFieldErrors(error)
      return
    }
    if (error.isAuthError) return // SessionManager redirects to login, keeping the draft
    const uncertain = error.is('TIMEOUT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE', 'INTERNAL_ERROR')
    setPhase({
      kind: 'error',
      message: uncertain
        ? 'Não conseguimos confirmar se o pedido foi criado. Tentar novamente é seguro: reutilizamos a mesma tentativa e não haverá compra duplicada.'
        : error.message,
      retry: 'pay',
    })
  }

  async function pay() {
    if (!quote) return
    try {
      let target = wallet
      if (!target) {
        setPhase({ kind: 'saving-wallet' })
        const { username: _username, note: _note, ...fields } = collector
        target = await createWallet.mutateAsync({
          ...fields,
          kind: 'primary',
          nickname: 'Principal',
        })
      }

      let session =
        connection &&
        connection.walletId === target.id &&
        connection.provider === provider &&
        connection.network === collector.network
          ? connection
          : null
      if (!session) {
        setPhase({ kind: 'connecting' })
        session = await connect.mutateAsync({
          walletId: target.id,
          provider,
          network: collector.network,
        })
        onConnection(session)
      }

      setPhase({ kind: 'submitting' })
      const body: CreateOrderRequest = {
        quoteId: quote.id,
        walletId: target.id,
        walletSessionId: session.id,
        provider,
        network: collector.network,
        collector,
      }
      const order = await createOrder.mutateAsync({
        body,
        idempotencyKey: orderAttempt.keyFor(user.id, body),
      })

      orderAttempt.clear(user.id)
      checkoutDraft.clear(user.id)
      onOpenChange(false)
      toast.success(`Pedido ${order.number} enviado. Aguardando a confirmação da rede.`)
      void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } })
    } catch (error) {
      handleFailure(error)
    }
  }

  const primary = (() => {
    if (outdated) return { label: 'Atualizar cotação', action: requestQuote, icon: true }
    switch (phase.kind) {
      case 'quoting':
        return { label: 'Calculando cotação…', action: undefined, spinner: true }
      case 'saving-wallet':
        return { label: 'Salvando carteira…', action: undefined, spinner: true }
      case 'connecting':
        return {
          label: `Aprove a conexão na ${WALLET_PROVIDER_LABEL[provider]}…`,
          action: undefined,
          spinner: true,
        }
      case 'submitting':
        return { label: 'Enviando pedido…', action: undefined, spinner: true }
      case 'changed':
        return {
          label: 'Aceitar novos valores',
          action: () => {
            setQuote(phase.next)
            setPhase({ kind: 'ready' })
          },
        }
      case 'error':
        return phase.retry === 'quote'
          ? { label: 'Recalcular cotação', action: requestQuote, icon: true }
          : phase.retry === 'pay'
            ? { label: 'Tentar novamente', action: () => void pay(), icon: true }
            : null
      default:
        return quote
          ? {
              label: connection
                ? `Pagar ${formatEth(quote.total)} ETH`
                : `Conectar e pagar ${formatEth(quote.total)} ETH`,
              action: () => void pay(),
            }
          : null
    }
  })()

  return (
    <Dialog open={open} onOpenChange={(next) => (busy && !next ? undefined : onOpenChange(next))}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle>Revise seu pedido</DialogTitle>
          <DialogDescription>
            Os valores abaixo foram revalidados agora. Nada é cobrado antes da sua confirmação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 p-5">
          <div aria-live="polite" className="space-y-3 empty:hidden">
            {outdated && (
              <FormAlert tone="info">
                Os preços ou a disponibilidade mudaram enquanto você revisava. Atualize a cotação
                para continuar.
              </FormAlert>
            )}
            {phase.kind === 'changed' && (
              <FormAlert tone="info">
                <p className="font-semibold text-foreground">Os valores do pedido mudaram:</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {phase.changes.map((change, index) => (
                    <li key={`${change.kind}-${index}`}>{change.message}</li>
                  ))}
                </ul>
                <p className="mt-2">
                  Novo total:{' '}
                  <strong className="text-brand">{formatEth(phase.next.total)} ETH</strong>.
                  Confirme os novos valores para continuar.
                </p>
              </FormAlert>
            )}
            {phase.kind === 'error' && (
              <FormAlert>
                {phase.message}
                {phase.toCart && (
                  <>
                    {' '}
                    <Link to="/carrinho" className="font-semibold text-brand underline">
                      Revisar carrinho
                    </Link>
                  </>
                )}
              </FormAlert>
            )}
            {phase.kind === 'connecting' && (
              <p className="flex items-center gap-2 text-sm text-sand">
                <Spinner aria-hidden /> Aguardando aprovação na {WALLET_PROVIDER_LABEL[provider]}{' '}
                (simulação).
              </p>
            )}
          </div>

          {quote ? (
            <>
              <OrderLines lines={quote.lines.map((line) => ({ ...line, id: line.lineId }))} />
              <OrderTotals
                subtotal={quote.subtotal}
                discount={quote.discount}
                networkFee={quote.networkFee}
                total={quote.total}
                coupon={quote.coupon}
                feeNote={`Taxa da rede ${NETWORK_LABEL[quote.network]} · cotação válida até ${formatDateTime(quote.expiresAt)}`}
              />
            </>
          ) : (
            <div className="space-y-3" aria-hidden>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          )}

          <dl className="grid gap-2 rounded-md bg-surface p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-meta">Carteira</dt>
              <dd>
                {wallet
                  ? `${wallet.nickname} · ${shortAddress(wallet.address)}`
                  : `Nova carteira · ${shortAddress(collector.address)}`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-meta">Rede e assinatura</dt>
              <dd>
                {NETWORK_LABEL[collector.network]} · {WALLET_PROVIDER_LABEL[provider]}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-meta">Colecionador</dt>
              <dd>
                {collector.displayName} (@{collector.username})
              </dd>
            </div>
            <div>
              <dt className="text-xs text-meta">E-mail</dt>
              <dd className="truncate">{collector.email}</dd>
            </div>
          </dl>
        </div>

        <DialogFooter className="sticky bottom-0 gap-2 border-t border-border bg-popover p-4 sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Voltar e editar
          </Button>
          {primary && (
            <Button
              onClick={primary.action}
              disabled={!primary.action || busy}
              className="sm:min-w-[15rem]"
            >
              {'spinner' in primary && primary.spinner && <Spinner aria-hidden />}
              {'icon' in primary && primary.icon && <RefreshCwIcon aria-hidden />}
              {primary.label}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
