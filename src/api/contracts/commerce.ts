import { z } from 'zod'
import { walletFieldsSchema, walletProviderSchema } from './account'
import { usernameSchema } from './auth'
import { ethAmountSchema, imageSchema, isoDateSchema, networkSchema } from './common'
import { editionIdSchema, nftSummarySchema } from './nft'

/* ─── Coupons ─────────────────────────────────────────────────────────────── */

export const couponSchema = z.object({
  code: z.string(),
  label: z.string(),
  /** Discount in basis points over the subtotal (1000 = 10%). */
  percentBps: z.number().int().min(0).max(10_000),
})
export type Coupon = z.infer<typeof couponSchema>

export const applyCouponRequestSchema = z.object({
  code: z.string().trim().min(1, 'Informe o código promocional').max(32, 'Código muito longo'),
})
export type ApplyCouponRequest = z.infer<typeof applyCouponRequestSchema>

/* ─── Cart ────────────────────────────────────────────────────────────────── */

export const cartItemStatusSchema = z.enum(['ok', 'price-changed', 'insufficient', 'sold-out'])
export type CartItemStatus = z.infer<typeof cartItemStatusSchema>

export const cartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  edition: editionIdSchema,
  editionLabel: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: imageSchema,
  quantity: z.number().int().min(1),
  /** Current catalog price for this edition. */
  unitPrice: ethAmountSchema,
  lineTotal: ethAmountSchema,
  available: z.number().int().min(0),
  /** min(available, maxPerOrder) — upper bound for the quantity stepper. */
  maxQuantity: z.number().int().min(0),
  /** Set while the price differs from the one the collector last saw. */
  priceChange: z.object({ from: ethAmountSchema, to: ethAmountSchema }).nullable(),
  status: cartItemStatusSchema,
  nftVersion: z.number().int(),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const cartSummarySchema = z.object({
  itemCount: z.number().int().min(0),
  subtotal: ethAmountSchema,
  discount: ethAmountSchema,
  networkFee: ethAmountSchema,
  total: ethAmountSchema,
  /** The cart shows an estimated fee; the checkout quote fixes it per network. */
  feeEstimated: z.boolean(),
})
export type CartSummary = z.infer<typeof cartSummarySchema>

export const cartSchema = z.object({
  id: z.string(),
  owner: z.enum(['guest', 'user']),
  items: z.array(cartItemSchema),
  coupon: couponSchema.nullable(),
  summary: cartSummarySchema,
  /** Bumped on every server-side change (items, coupon, catalog prices). */
  version: z.number().int().min(0),
  updatedAt: isoDateSchema,
})
export type Cart = z.infer<typeof cartSchema>

export const addCartItemRequestSchema = z.object({
  nftId: z.string(),
  edition: editionIdSchema,
  quantity: z.number().int().min(1),
})
export type AddCartItemRequest = z.infer<typeof addCartItemRequestSchema>

export const updateCartItemRequestSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  /** Marks the current price as seen, clearing `priceChange`. */
  acknowledgePrice: z.boolean().optional(),
})
export type UpdateCartItemRequest = z.infer<typeof updateCartItemRequestSchema>

/** 409 AVAILABILITY_CONFLICT details. */
export const availabilityConflictSchema = z.object({
  items: z.array(
    z.object({
      nftId: z.string(),
      name: z.string(),
      edition: editionIdSchema,
      requested: z.number().int(),
      available: z.number().int(),
    }),
  ),
})
export type AvailabilityConflict = z.infer<typeof availabilityConflictSchema>

/* ─── Quote ───────────────────────────────────────────────────────────────── */

export const quoteLineSchema = z.object({
  lineId: z.string(),
  nftId: z.string(),
  edition: editionIdSchema,
  editionLabel: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: imageSchema,
  quantity: z.number().int().min(1),
  unitPrice: ethAmountSchema,
  lineTotal: ethAmountSchema,
  nftVersion: z.number().int(),
})
export type QuoteLine = z.infer<typeof quoteLineSchema>

export const quoteSchema = z.object({
  id: z.string(),
  cartVersion: z.number().int(),
  network: networkSchema,
  lines: z.array(quoteLineSchema).min(1),
  coupon: couponSchema.nullable(),
  subtotal: ethAmountSchema,
  discount: ethAmountSchema,
  networkFee: ethAmountSchema,
  total: ethAmountSchema,
  createdAt: isoDateSchema,
  expiresAt: isoDateSchema,
})
export type Quote = z.infer<typeof quoteSchema>

export const createQuoteRequestSchema = z.object({ network: networkSchema })
export type CreateQuoteRequest = z.infer<typeof createQuoteRequestSchema>

export const quoteChangeSchema = z.object({
  kind: z.enum(['price', 'availability', 'coupon', 'fee', 'removed', 'expired']),
  message: z.string(),
  lineId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})
export type QuoteChange = z.infer<typeof quoteChangeSchema>

/** 409 QUOTE_CHANGED details: the fresh quote the collector must re-confirm. */
export const quoteChangedSchema = z.object({
  quote: quoteSchema,
  changes: z.array(quoteChangeSchema).min(1),
})
export type QuoteChanged = z.infer<typeof quoteChangedSchema>

/* ─── Orders ──────────────────────────────────────────────────────────────── */

export const collectorSchema = walletFieldsSchema.extend({
  username: usernameSchema,
  note: z.string().trim().max(500, 'Máximo de 500 caracteres'),
})
export type Collector = z.infer<typeof collectorSchema>

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'declined'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const transactionSchema = z.object({
  hash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  confirmations: z.number().int().min(0),
})

export const orderSchema = z.object({
  id: z.string(),
  number: z.string(),
  userId: z.string(),
  status: orderStatusSchema,
  statusReason: z.string().nullable(),
  quoteId: z.string(),
  lines: z.array(quoteLineSchema).min(1),
  coupon: couponSchema.nullable(),
  subtotal: ethAmountSchema,
  discount: ethAmountSchema,
  networkFee: ethAmountSchema,
  total: ethAmountSchema,
  network: networkSchema,
  provider: walletProviderSchema,
  wallet: z.object({ id: z.string(), nickname: z.string(), address: z.string() }),
  collector: collectorSchema,
  transaction: transactionSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  settledAt: isoDateSchema.nullable(),
  version: z.number().int().min(1),
})
export type Order = z.infer<typeof orderSchema>

export const createOrderRequestSchema = z.object({
  quoteId: z.string(),
  walletId: z.string(),
  walletSessionId: z.string(),
  provider: walletProviderSchema,
  network: networkSchema,
  collector: collectorSchema,
})
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>

export const ordersResponseSchema = z.object({ items: z.array(orderSchema) })

export function isTerminalOrderStatus(status: OrderStatus) {
  return status === 'confirmed' || status === 'declined'
}

/* ─── Favorites ───────────────────────────────────────────────────────────── */

export const favoriteSchema = z.object({
  nftId: z.string(),
  addedAt: isoDateSchema,
  nft: nftSummarySchema,
})
export type Favorite = z.infer<typeof favoriteSchema>

export const favoritesResponseSchema = z.object({ items: z.array(favoriteSchema) })
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>
