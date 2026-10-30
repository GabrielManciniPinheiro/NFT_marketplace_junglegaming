import { z } from 'zod'
import { ethAmountSchema, isoDateSchema } from './common'
import { orderStatusSchema, transactionSchema } from './commerce'
import { editionIdSchema } from './nft'

/**
 * Socket.IO event envelopes.
 *
 * Every event carries a stable `id` (dedupe), the affected `resource` and the resource
 * `version` after the change, so clients can drop duplicates and stale deliveries
 * without regressing newer state.
 */

export const REALTIME_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
} as const

export const nftUpdatedEventSchema = z.object({
  id: z.string(),
  type: z.literal(REALTIME_EVENTS.nftUpdated),
  resource: z.object({ type: z.literal('nft'), id: z.string() }),
  version: z.number().int().min(1),
  occurredAt: isoDateSchema,
  data: z.object({
    price: ethAmountSchema,
    previousPrice: ethAmountSchema.nullable(),
    available: z.number().int().min(0),
    editions: z.array(
      z.object({
        id: editionIdSchema,
        price: ethAmountSchema,
        available: z.number().int().min(0),
      }),
    ),
  }),
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = z.object({
  id: z.string(),
  type: z.literal(REALTIME_EVENTS.orderUpdated),
  resource: z.object({ type: z.literal('order'), id: z.string() }),
  version: z.number().int().min(1),
  occurredAt: isoDateSchema,
  /** Owner of the order: clients ignore events addressed to another user. */
  userId: z.string(),
  data: z.object({
    status: orderStatusSchema,
    statusReason: z.string().nullable(),
    transaction: transactionSchema,
  }),
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export const realtimeEventSchema = z.discriminatedUnion('type', [
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
])
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>

/** Handshake payload sent by the client in the Socket.IO CONNECT packet (`auth`). */
export const realtimeAuthSchema = z.object({ token: z.string().nullable() })
export type RealtimeAuth = z.infer<typeof realtimeAuthSchema>
