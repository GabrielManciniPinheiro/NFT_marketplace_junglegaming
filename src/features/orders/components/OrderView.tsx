import { Link } from '@tanstack/react-router'
import {
  CheckCircle2Icon,
  CircleDotIcon,
  CopyIcon,
  ExternalLinkIcon,
  PrinterIcon,
  XCircleIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { NETWORK_LABEL, WALLET_PROVIDER_LABEL, type Order } from '@/api/contracts'
import { EthAmount } from '@/components/common/EthAmount'
import { NftImage } from '@/components/common/NftImage'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { OrderTotals } from '@/features/checkout/components/OrderLines'
import { formatDateTime, shortAddress } from '@/lib/format'

function Step({
  done,
  active,
  children,
}: {
  done: boolean
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <li className={cn('flex items-center gap-2 text-sm', done ? 'text-foreground' : 'text-meta')}>
      {done ? (
        <CheckCircle2Icon className="size-4 text-success" aria-hidden />
      ) : active ? (
        <Spinner className="size-4 text-brand" aria-hidden />
      ) : (
        <CircleDotIcon className="size-4" aria-hidden />
      )}
      {children}
      <span className="sr-only">
        {done ? '(concluído)' : active ? '(em andamento)' : '(pendente)'}
      </span>
    </li>
  )
}

/** Snapshot lines: values come from the order, never from the current catalog. */
function ReceiptLines({ order }: { order: Order }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Itens do pedido {order.number}</caption>
      <thead className="text-left text-xs text-meta">
        <tr className="border-b border-border">
          <th scope="col" className="pb-2 font-normal">
            NFT
          </th>
          <th scope="col" className="hidden pb-2 font-normal sm:table-cell">
            Preço unitário
          </th>
          <th scope="col" className="pb-2 text-center font-normal">
            Qtd.
          </th>
          <th scope="col" className="pb-2 text-right font-normal">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {order.lines.map((line) => (
          <tr key={line.lineId} className="border-b border-border/60">
            <td className="py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 shrink-0">
                  <NftImage image={line.image} sizes="40px" decorative className="rounded-sm" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{line.name}</p>
                  <p className="text-xs text-meta">
                    {line.tokenId} · Edição {line.editionLabel}
                  </p>
                </div>
              </div>
            </td>
            <td className="hidden py-3 text-sand sm:table-cell">
              <EthAmount value={line.unitPrice} />
            </td>
            <td className="py-3 text-center tabular-nums">{line.quantity}</td>
            <td className="py-3 text-right font-bold text-brand">
              <EthAmount value={line.lineTotal} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PaymentFacts({ order }: { order: Order }) {
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Hash da transação copiado.')
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto manualmente.')
    }
  }
  return (
    <dl className="grid gap-4 rounded-md bg-surface p-4 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs text-meta">Pedido</dt>
        <dd className="font-semibold">{order.number}</dd>
      </div>
      <div>
        <dt className="text-xs text-meta">{order.settledAt ? 'Concluído em' : 'Criado em'}</dt>
        <dd>
          <time dateTime={order.settledAt ?? order.createdAt}>
            {formatDateTime(order.settledAt ?? order.createdAt)}
          </time>
        </dd>
      </div>
      <div>
        <dt className="text-xs text-meta">Carteira</dt>
        <dd>
          {order.wallet.nickname} ·{' '}
          <span className="font-mono">{shortAddress(order.wallet.address)}</span>
        </dd>
      </div>
      <div>
        <dt className="text-xs text-meta">Rede e assinatura</dt>
        <dd>
          {NETWORK_LABEL[order.network]} · {WALLET_PROVIDER_LABEL[order.provider]}
        </dd>
      </div>
      {order.transaction.hash && (
        <div className="sm:col-span-2">
          <dt className="text-xs text-meta">
            Transação ({order.transaction.confirmations} confirmações)
          </dt>
          <dd className="flex flex-wrap items-center gap-2">
            <span className="font-mono break-all">{order.transaction.hash}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Copiar hash da transação"
              onClick={() => void copy(order.transaction.hash!)}
            >
              <CopyIcon aria-hidden />
            </Button>
          </dd>
          {order.transaction.explorerUrl && (
            <dd className="mt-1">
              <Link
                to="/explorador/tx/$hash"
                params={{ hash: order.transaction.hash }}
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                Ver no explorador (simulado)
                <ExternalLinkIcon className="size-3.5" aria-hidden />
              </Link>
            </dd>
          )}
        </div>
      )}
    </dl>
  )
}

export function OrderView({ order }: { order: Order }) {
  const status = order.status

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-3 text-center"
      >
        {status === 'pending' && (
          <>
            <Spinner className="size-10 text-brand" aria-hidden />
            <h1 className="text-2xl font-bold">Aguardando confirmação da rede</h1>
            <p className="max-w-xl text-sm text-sand">
              O pedido {order.number} foi criado e a transação está sendo confirmada. Isso costuma
              levar poucos segundos — você pode sair desta página, avisaremos quando terminar.
            </p>
          </>
        )}
        {status === 'confirmed' && (
          <>
            <CheckCircle2Icon className="size-12 text-success" aria-hidden />
            <h1 className="text-2xl font-bold">Pedido confirmado</h1>
            <p className="max-w-xl text-sm text-sand">
              Obrigado, {order.collector.displayName}! Seus NFTs foram transferidos para a carteira{' '}
              {order.wallet.nickname}.
            </p>
          </>
        )}
        {status === 'declined' && (
          <>
            <XCircleIcon className="size-12 text-destructive" aria-hidden />
            <h1 className="text-2xl font-bold">Pagamento recusado</h1>
            <p className="max-w-xl text-sm text-sand">{order.statusReason}</p>
            <p className="text-sm text-foreground">
              Nada foi cobrado e seus itens continuam no carrinho.
            </p>
          </>
        )}
      </div>

      {status === 'pending' && (
        <ol className="mx-auto w-fit space-y-2" aria-label="Etapas do pagamento">
          <Step done>Pedido criado</Step>
          <Step done>Assinatura aprovada na carteira</Step>
          <Step done={false} active>
            Confirmação na rede {NETWORK_LABEL[order.network]}
          </Step>
        </ol>
      )}

      <section
        aria-labelledby="receipt-title"
        className="space-y-5 rounded-lg border border-border p-5 sm:p-6"
      >
        <h2 id="receipt-title" className="text-base font-bold">
          {status === 'confirmed' ? 'Recibo' : 'Resumo do pedido'}
        </h2>
        <PaymentFacts order={order} />
        <ReceiptLines order={order} />
        <OrderTotals
          subtotal={order.subtotal}
          discount={order.discount}
          networkFee={order.networkFee}
          total={order.total}
          coupon={order.coupon}
        />
      </section>

      <div className="flex flex-wrap justify-center gap-3 print:hidden">
        {status === 'declined' ? (
          <>
            <Button asChild>
              <Link to="/pagamento">Tentar novamente</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/carrinho">Voltar ao carrinho</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild>
              <Link to="/mercado">Continuar explorando</Link>
            </Button>
            {status === 'confirmed' && (
              <Button variant="outline" onClick={() => window.print()}>
                <PrinterIcon aria-hidden />
                Imprimir recibo
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
