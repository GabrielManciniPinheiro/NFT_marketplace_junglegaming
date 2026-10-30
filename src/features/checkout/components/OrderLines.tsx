import type { Coupon } from '@/api/contracts'
import { EthAmount } from '@/components/common/EthAmount'
import { NftImage } from '@/components/common/NftImage'
import type { Image } from '@/api/contracts'

export interface OrderLineView {
  id: string
  name: string
  tokenId: string
  editionLabel: string
  image: Image
  quantity: number
  lineTotal: string
}

/** "Seus NFTs" list: thumbnail, name, token id, quantity and line total. */
export function OrderLines({ lines }: { lines: OrderLineView[] }) {
  return (
    <div className="space-y-2">
      <div aria-hidden className="flex justify-between text-sm font-semibold">
        <span>NFTs</span>
        <span>Subtotal</span>
      </div>
      <ul className="space-y-2">
        {lines.map((line) => (
          <li key={line.id} className="flex items-center gap-3 rounded-md bg-surface p-2">
            <div className="w-12 shrink-0">
              <NftImage image={line.image} sizes="48px" decorative className="rounded-sm" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{line.name}</p>
              <p className="truncate text-xs text-meta">
                ID do token: {line.tokenId} · {line.editionLabel}
              </p>
            </div>
            <span className="text-xs text-sand tabular-nums">
              <span aria-hidden>(x {line.quantity})</span>
              <span className="sr-only">Quantidade: {line.quantity}</span>
            </span>
            <span className="text-sm font-bold text-brand">
              <EthAmount value={line.lineTotal} label="Subtotal do item" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function OrderTotals({
  subtotal,
  discount,
  networkFee,
  total,
  coupon,
  feeNote,
}: {
  subtotal: string
  discount: string
  networkFee: string
  total: string
  coupon: Coupon | null
  feeNote?: string
}) {
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-soft">Subtotal</dt>
        <dd>
          <EthAmount value={subtotal} />
        </dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-soft">Desconto{coupon ? ` (${coupon.code})` : ' do lançamento'}</dt>
        <dd className="whitespace-nowrap">
          (−) <EthAmount value={discount} />
        </dd>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-x-4">
        <dt className="text-soft">Taxa de rede</dt>
        <dd>
          <EthAmount value={networkFee} />
        </dd>
        {feeNote && (
          <dd className="col-span-2 mt-1 text-center text-[0.6875rem] text-brand">{feeNote}</dd>
        )}
      </div>
      <div className="flex justify-between gap-4 border-t border-border pt-4 text-base font-bold">
        <dt>Total</dt>
        <dd className="text-brand">
          <EthAmount value={total} />
        </dd>
      </div>
    </dl>
  )
}
