import type { z } from 'zod'
import type {
  CartMergeReport,
  cartSchema,
  Collector,
  Network,
  OrderUpdatedEvent,
  QuoteChange,
  WalletProvider,
} from '@/api/contracts'
import { eth, formatEth } from '@/lib/eth'
import { mockConfig } from '../config'
import {
  store,
  type CartRecord,
  type OrderDto,
  type OrderRecord,
  type QuoteDto,
  type WalletRecord,
} from '../db/store'
import { NETWORK_FEES } from '../fixtures/accounts'
import { mainImage } from '../fixtures/catalog'
import { fail } from '../lib/http'
import { hexDigest } from '../lib/random'
import { emitToUser } from '../realtime/server'
import { editionsOf, nextEventId, rememberEvent, updateNft } from './catalog'

type CartDto = z.input<typeof cartSchema>

const QUOTE_TTL_MS = 10 * 60_000
const nowIso = () => new Date().toISOString()
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' })

/* ─── Coupons ─────────────────────────────────────────────────────────────── */

export function activeCoupon(code: string | null) {
  if (!code) return null
  const coupon = store.state.coupons[code]
  return coupon && Date.parse(coupon.expiresAt) > Date.now() ? coupon : null
}

export function couponForCode(rawCode: string) {
  const code = rawCode.trim().toUpperCase()
  const coupon = store.state.coupons[code]
  if (!coupon) {
    throw fail(422, 'COUPON_INVALID', 'Cupom inválido. Confira o código e tente novamente.', {
      fieldErrors: { code: ['Cupom inválido'] },
    })
  }
  if (Date.parse(coupon.expiresAt) <= Date.now()) {
    throw fail(
      422,
      'COUPON_EXPIRED',
      `O cupom ${coupon.code} expirou em ${formatDate(coupon.expiresAt)}.`,
      {
        fieldErrors: { code: ['Cupom expirado'] },
      },
    )
  }
  return coupon
}

/* ─── Carts ───────────────────────────────────────────────────────────────── */

export function userCart(userId: string): CartRecord {
  const id = `cart_${userId}`
  return (store.state.carts[id] ??= {
    id,
    userId,
    lines: [],
    couponCode: null,
    version: 1,
    updatedAt: nowIso(),
  })
}

export function createGuestCart(): CartRecord {
  const cart: CartRecord = {
    id: store.nextId('gcart'),
    userId: null,
    lines: [],
    couponCode: null,
    version: 1,
    updatedAt: nowIso(),
  }
  store.state.carts[cart.id] = cart
  return cart
}

/** Authenticated users get their account cart; guests the cart named by `X-Guest-Cart`. */
export function resolveCart(userId: string | null, request: Request): CartRecord {
  if (userId) return userCart(userId)
  const guestId = request.headers.get('X-Guest-Cart')
  const existing = guestId ? store.state.carts[guestId] : undefined
  return existing && existing.userId === null ? existing : createGuestCart()
}

export function touch(cart: CartRecord) {
  cart.version += 1
  cart.updatedAt = nowIso()
}

export function lineEdition(nftId: string, editionId: string) {
  const nft = store.getNft(nftId)
  const edition = nft
    ? editionsOf(nft.fixture, nft.state).find((item) => item.id === editionId)
    : undefined
  return nft && edition ? { nft, edition } : null
}

export function cartView(cart: CartRecord): CartDto {
  const items = cart.lines.flatMap((line) => {
    const resolved = lineEdition(line.nftId, line.edition)
    if (!resolved) return []
    const { nft, edition } = resolved
    const priceChanged = !eth.eq(line.seenPrice, edition.price)
    const status =
      edition.available === 0
        ? 'sold-out'
        : line.quantity > edition.available
          ? 'insufficient'
          : priceChanged
            ? 'price-changed'
            : 'ok'
    return [
      {
        id: line.id,
        nftId: line.nftId,
        edition: line.edition,
        editionLabel: edition.label,
        name: nft.fixture.name,
        tokenId: nft.fixture.tokenId,
        image: mainImage(nft.fixture.art, nft.fixture.name),
        quantity: line.quantity,
        unitPrice: edition.price,
        lineTotal: eth.mul(edition.price, line.quantity),
        available: edition.available,
        maxQuantity: Math.min(edition.available, edition.maxPerOrder),
        priceChange: priceChanged ? { from: line.seenPrice, to: edition.price } : null,
        status,
        nftVersion: nft.state.version,
      } as const,
    ]
  })

  const subtotal = eth.add('0', ...items.map((item) => item.lineTotal))
  const coupon = activeCoupon(cart.couponCode)
  const discount = coupon ? eth.bps(subtotal, coupon.percentBps) : '0'
  const networkFee = items.length ? NETWORK_FEES.ethereum : '0'

  return {
    id: cart.id,
    owner: cart.userId ? 'user' : 'guest',
    items,
    coupon: coupon
      ? { code: coupon.code, label: coupon.label, percentBps: coupon.percentBps }
      : null,
    summary: {
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      discount,
      networkFee,
      total: eth.add(eth.sub(subtotal, discount), networkFee),
      feeEstimated: true,
    },
    version: cart.version,
    updatedAt: cart.updatedAt,
  }
}

/** Merges the visitor cart into the account cart, capping quantities by availability. */
export function mergeGuestCart(
  userId: string,
  guestCartId: string | undefined,
): CartMergeReport | null {
  const guest = guestCartId ? store.state.carts[guestCartId] : undefined
  if (!guest || guest.userId !== null) return null

  const target = userCart(userId)
  const report: CartMergeReport = { mergedLines: 0, adjusted: [] }

  for (const line of guest.lines) {
    const resolved = lineEdition(line.nftId, line.edition)
    if (!resolved) continue
    const { nft, edition } = resolved
    const limit = Math.min(edition.available, edition.maxPerOrder)
    const existing = target.lines.find(
      (item) => item.nftId === line.nftId && item.edition === line.edition,
    )
    const requested = (existing?.quantity ?? 0) + line.quantity
    const kept = Math.min(requested, limit)

    if (kept < requested) {
      report.adjusted.push({ name: nft.fixture.name, editionLabel: edition.label, requested, kept })
    }
    if (kept <= 0) continue
    if (existing) existing.quantity = kept
    else target.lines.push({ ...line, id: store.nextId('line'), quantity: kept })
    report.mergedLines += 1
  }

  if (!target.couponCode && guest.couponCode) target.couponCode = guest.couponCode
  delete store.state.carts[guest.id]
  touch(target)
  return report
}

/* ─── Quotes ──────────────────────────────────────────────────────────────── */

export function buildQuote(cart: CartRecord, network: Network, userId: string): QuoteDto {
  const view = cartView(cart)
  if (!view.items.length) throw fail(422, 'VALIDATION_FAILED', 'Seu carrinho está vazio.')

  const blocked = view.items.filter(
    (item) => item.status === 'sold-out' || item.status === 'insufficient',
  )
  if (blocked.length) {
    throw fail(409, 'AVAILABILITY_CONFLICT', 'Alguns itens não têm disponibilidade suficiente.', {
      details: {
        items: blocked.map((item) => ({
          nftId: item.nftId,
          name: item.name,
          edition: item.edition,
          requested: item.quantity,
          available: item.available,
        })),
      },
    })
  }

  const coupon = activeCoupon(cart.couponCode)
  const subtotal = view.summary.subtotal
  const discount = coupon ? eth.bps(subtotal, coupon.percentBps) : '0'
  const networkFee = NETWORK_FEES[network]
  const now = Date.now()

  const quote: QuoteDto = {
    id: store.nextId('qt'),
    cartVersion: cart.version,
    network,
    lines: view.items.map((item) => ({
      lineId: item.id,
      nftId: item.nftId,
      edition: item.edition,
      editionLabel: item.editionLabel,
      name: item.name,
      tokenId: item.tokenId,
      image: item.image,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      nftVersion: item.nftVersion,
    })),
    coupon: view.coupon,
    subtotal,
    discount,
    networkFee,
    total: eth.add(eth.sub(subtotal, discount), networkFee),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
  }

  // Quoting acknowledges the prices the collector is about to review.
  for (const line of cart.lines) {
    const resolved = lineEdition(line.nftId, line.edition)
    if (resolved) line.seenPrice = resolved.edition.price
  }

  store.state.quotes[quote.id] = { quote, userId, cartId: cart.id }
  return quote
}

/** Differences between a confirmed quote and a fresh one computed from current state. */
export function diffQuotes(previous: QuoteDto, next: QuoteDto, expired: boolean): QuoteChange[] {
  const changes: QuoteChange[] = []
  if (expired) changes.push({ kind: 'expired', message: 'A cotação expirou e foi recalculada.' })

  for (const line of previous.lines) {
    const current = next.lines.find((item) => item.lineId === line.lineId)
    const label = `${line.name} (${line.editionLabel})`
    if (!current) {
      changes.push({ kind: 'removed', lineId: line.lineId, message: `${label} saiu do carrinho.` })
    } else if (!eth.eq(current.unitPrice, line.unitPrice)) {
      changes.push({
        kind: 'price',
        lineId: line.lineId,
        from: line.unitPrice,
        to: current.unitPrice,
        message: `O preço de ${label} mudou de ${formatEth(line.unitPrice)} para ${formatEth(current.unitPrice)} ETH.`,
      })
    } else if (current.quantity !== line.quantity) {
      changes.push({
        kind: 'availability',
        lineId: line.lineId,
        from: String(line.quantity),
        to: String(current.quantity),
        message: `A quantidade de ${label} mudou de ${line.quantity} para ${current.quantity}.`,
      })
    }
  }
  for (const line of next.lines) {
    if (!previous.lines.some((item) => item.lineId === line.lineId)) {
      changes.push({
        kind: 'removed',
        lineId: line.lineId,
        message: `${line.name} entrou no carrinho.`,
      })
    }
  }
  if ((previous.coupon?.code ?? null) !== (next.coupon?.code ?? null)) {
    changes.push({
      kind: 'coupon',
      from: previous.coupon?.code,
      to: next.coupon?.code,
      message: previous.coupon
        ? `O cupom ${previous.coupon.code} não é mais válido e foi removido.`
        : 'Um cupom foi aplicado ao carrinho.',
    })
  }
  if (!eth.eq(previous.networkFee, next.networkFee)) {
    changes.push({
      kind: 'fee',
      from: previous.networkFee,
      to: next.networkFee,
      message: `A taxa de rede mudou de ${formatEth(previous.networkFee)} para ${formatEth(next.networkFee)} ETH.`,
    })
  }
  return changes
}

/* ─── Orders ──────────────────────────────────────────────────────────────── */

export function orderNumber() {
  store.state.counters.order += 1
  const year = new Date().getUTCFullYear()
  return `KUR-${year}-${String(store.state.counters.order).padStart(6, '0')}`
}

export function createOrder(input: {
  userId: string
  quote: QuoteDto
  wallet: WalletRecord
  provider: WalletProvider
  network: Network
  collector: Collector
}): OrderRecord {
  const delayMs = mockConfig.get().settlementDelayMs
  const now = nowIso()
  const order: OrderDto = {
    id: store.nextId('ord'),
    number: orderNumber(),
    userId: input.userId,
    status: 'pending',
    statusReason: null,
    quoteId: input.quote.id,
    lines: input.quote.lines,
    coupon: input.quote.coupon,
    subtotal: input.quote.subtotal,
    discount: input.quote.discount,
    networkFee: input.quote.networkFee,
    total: input.quote.total,
    network: input.network,
    provider: input.provider,
    wallet: { id: input.wallet.id, nickname: input.wallet.nickname, address: input.wallet.address },
    collector: input.collector,
    transaction: { hash: null, explorerUrl: null, confirmations: 0 },
    createdAt: now,
    updatedAt: now,
    settledAt: null,
    version: 1,
  }
  const record: OrderRecord = {
    order,
    settleAt: delayMs > 0 ? Date.now() + delayMs : null,
    reservation: order.lines.map((line) => ({
      nftId: line.nftId,
      edition: line.edition,
      quantity: line.quantity,
    })),
  }
  store.state.orders[order.id] = record
  scheduleSettlement(record)
  return record
}

function buildOrderEvent(order: OrderDto): OrderUpdatedEvent {
  return {
    id: nextEventId(),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: nowIso(),
    userId: order.userId,
    data: {
      status: order.status,
      statusReason: order.statusReason,
      transaction: order.transaction,
    },
  } as OrderUpdatedEvent
}

/** Removes exactly the purchased quantities from the buyer's cart (other lines stay). */
function removePurchased(order: OrderDto) {
  const cart = store.state.carts[`cart_${order.userId}`]
  if (!cart) return
  for (const line of order.lines) {
    const index = cart.lines.findIndex(
      (item) => item.nftId === line.nftId && item.edition === line.edition,
    )
    if (index < 0) continue
    const item = cart.lines[index]!
    item.quantity -= line.quantity
    if (item.quantity <= 0) cart.lines.splice(index, 1)
  }
  if (order.coupon && cart.couponCode === order.coupon.code) cart.couponCode = null
  touch(cart)
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

/** Settles a pending order. Confirmed and declined are terminal. */
export function settleOrder(orderId: string, outcome = mockConfig.get().paymentOutcome) {
  const record = store.state.orders[orderId]
  if (!record || record.order.status !== 'pending') return record?.order ?? null
  clearTimeout(timers.get(orderId))
  timers.delete(orderId)

  const { order } = record
  let status: 'confirmed' | 'declined' = outcome === 'confirm' ? 'confirmed' : 'declined'
  let reason =
    status === 'declined'
      ? 'Pagamento recusado: a carteira não autorizou a transação (saldo insuficiente na simulação).'
      : null

  if (status === 'confirmed') {
    const shortage = order.lines.find((line) => {
      const available = store.getNft(line.nftId)?.state.editions[line.edition]?.available ?? 0
      return available < line.quantity
    })
    if (shortage) {
      status = 'declined'
      reason = `A edição ${shortage.editionLabel} de ${shortage.name} esgotou antes da confirmação.`
    }
  }

  if (status === 'confirmed') {
    for (const line of order.lines) {
      updateNft(line.nftId, { edition: line.edition, availableDelta: -line.quantity })
    }
    removePurchased(order)
    const hash = `0x${hexDigest(order.id)}`
    order.transaction = { hash, explorerUrl: `/explorador/tx/${hash}`, confirmations: 12 }
  }

  const now = nowIso()
  order.status = status
  order.statusReason = reason
  order.settledAt = now
  order.updatedAt = now
  order.version += 1
  record.settleAt = null

  const event = buildOrderEvent(order)
  rememberEvent(event)
  store.commit()
  emitToUser(order.userId, event)
  return order
}

export function scheduleSettlement(record: OrderRecord) {
  const { order, settleAt } = record
  if (order.status !== 'pending' || settleAt == null) return
  clearTimeout(timers.get(order.id))
  timers.set(
    order.id,
    setTimeout(
      () => {
        store.sync()
        settleOrder(order.id)
      },
      Math.max(0, settleAt - Date.now()),
    ),
  )
}

/** Re-arms settlement timers after a reload (pending orders survive refreshes). */
export function resumeSettlements() {
  for (const record of Object.values(store.state.orders)) scheduleSettlement(record)
}

export function pendingOrders() {
  return Object.values(store.state.orders).filter((record) => record.order.status === 'pending')
}
