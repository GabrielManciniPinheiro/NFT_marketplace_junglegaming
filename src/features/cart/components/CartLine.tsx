import { Link } from '@tanstack/react-router'
import { Trash2Icon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import type { CartItem } from '@/api/contracts'
import { getErrorMessage } from '@/api/errors'
import { EthAmount } from '@/components/common/EthAmount'
import { NftImage } from '@/components/common/NftImage'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatEth } from '@/lib/eth'
import { useAddToCart, useRemoveCartItem, useUpdateCartItem } from '../mutations'

/** Row grid shared with the (visual-only) header of the cart table. */
export const CART_GRID =
  'md:grid md:grid-cols-[minmax(0,1fr)_7.5rem_7.5rem_7.5rem_2.5rem] md:items-center md:gap-4'

function LineNotice({
  item,
  onAdjust,
  onAcknowledge,
}: {
  item: CartItem
  onAdjust: () => void
  onAcknowledge: () => void
}) {
  if (item.status === 'ok') return null
  const tone = item.status === 'price-changed' ? 'text-brand' : 'text-destructive'
  return (
    <div className={cn('mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs', tone)}>
      <TriangleAlertIcon className="size-3.5 shrink-0" aria-hidden />
      {item.status === 'sold-out' && (
        <span>Esta edição esgotou. Remova o item para finalizar a compra.</span>
      )}
      {item.status === 'insufficient' && (
        <>
          <span>
            Restam apenas {item.available} unidade{item.available === 1 ? '' : 's'} desta edição.
          </span>
          <Button variant="link" size="xs" className="h-auto p-0 text-xs" onClick={onAdjust}>
            Ajustar para {item.maxQuantity}
          </Button>
        </>
      )}
      {item.status === 'price-changed' && item.priceChange && (
        <>
          <span>
            Preço atualizado: {formatEth(item.priceChange.from)} → {formatEth(item.priceChange.to)}{' '}
            ETH.
          </span>
          <Button variant="link" size="xs" className="h-auto p-0 text-xs" onClick={onAcknowledge}>
            Ok, entendi
          </Button>
        </>
      )}
    </div>
  )
}

export function CartLine({ item }: { item: CartItem }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const restore = useAddToCart()
  const busy = update.isPending || remove.isPending
  const shownQuantity =
    update.isPending && update.variables.body.quantity
      ? update.variables.body.quantity
      : item.quantity

  const setQuantity = (quantity: number) =>
    update.mutate(
      { itemId: item.id, body: { quantity } },
      { onError: (error) => toast.error(getErrorMessage(error), { id: `line-${item.id}` }) },
    )

  const removeLine = () =>
    remove.mutate(item.id, {
      onSuccess: () =>
        toast(`${item.name} (${item.editionLabel}) foi removido do carrinho.`, {
          id: `line-${item.id}`,
          action: {
            label: 'Desfazer',
            onClick: () =>
              restore.mutate(
                { nftId: item.nftId, edition: item.edition, quantity: item.quantity },
                { onError: (error) => toast.error(getErrorMessage(error)) },
              ),
          },
        }),
      onError: (error) => toast.error(getErrorMessage(error), { id: `line-${item.id}` }),
    })

  return (
    <li
      aria-busy={busy}
      className={cn(
        'rounded-md bg-surface p-3 transition-opacity md:px-3 md:py-2.5',
        busy && 'opacity-80',
      )}
    >
      <div className={cn('grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-3', CART_GRID)}>
        <div className="contents md:flex md:items-center md:gap-4">
          <div className="row-span-2 w-[4.5rem] shrink-0 md:row-span-1 md:w-[3.75rem]">
            <NftImage image={item.image} sizes="72px" decorative className="rounded-md" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold">
              <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="hover:text-brand">
                {item.name}
              </Link>
            </h3>
            <p className="text-xs text-meta">
              ID do token: {item.tokenId} · Edição {item.editionLabel}
            </p>
            <p className="mt-1 text-sm font-bold text-sand md:hidden">
              <EthAmount value={item.unitPrice} label="Preço unitário" />
            </p>
          </div>
        </div>

        <p className="hidden text-sm font-bold text-sand md:block">
          <EthAmount value={item.unitPrice} label="Preço unitário" />
        </p>

        <div className="col-start-2 flex items-center justify-between gap-3 md:contents">
          <div className="flex items-center gap-2">
            <QuantityStepper
              size="sm"
              value={shownQuantity}
              max={Math.max(item.maxQuantity, 1)}
              onChange={setQuantity}
              label={`Quantidade de ${item.name}, edição ${item.editionLabel}`}
              disabled={remove.isPending || item.maxQuantity === 0}
            />
            {update.isPending && (
              <Spinner className="size-3 text-meta" aria-label="Atualizando quantidade" />
            )}
          </div>

          <p className="text-sm font-bold text-brand">
            <EthAmount value={item.lineTotal} label="Total do item" />
          </p>

          <Button
            variant="ghost"
            size="icon-sm"
            className="text-meta hover:text-destructive"
            onClick={removeLine}
            disabled={busy}
            aria-label={`Remover ${item.name} (${item.editionLabel}) do carrinho`}
          >
            <Trash2Icon className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <LineNotice
        item={item}
        onAdjust={() => setQuantity(item.maxQuantity)}
        onAcknowledge={() => update.mutate({ itemId: item.id, body: { acknowledgePrice: true } })}
      />
    </li>
  )
}
