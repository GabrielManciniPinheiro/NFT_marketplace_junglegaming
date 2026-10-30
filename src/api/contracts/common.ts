import { z } from 'zod'
import { isEthAmount } from '@/lib/eth'

/** Decimal ETH amount transported as a string to preserve precision (up to 18 decimals). */
export const ethAmountSchema = z
  .string()
  .refine(isEthAmount, { error: 'Valor em ETH inválido' })
  .brand<'EthAmount'>()
export type EthAmount = z.infer<typeof ethAmountSchema>

export const isoDateSchema = z.iso.datetime({ offset: true })

export const pageInfoSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
})
export type PageInfo = z.infer<typeof pageInfoSchema>

export const networkSchema = z.enum(['ethereum', 'polygon', 'solana'])
export type Network = z.infer<typeof networkSchema>

export const NETWORK_LABEL: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

/**
 * Error envelope shared by every endpoint. HTTP status + `code` describe the failure;
 * `fieldErrors` maps form fields to messages for 422/409 responses.
 */
export const apiErrorCodeSchema = z.enum([
  'VALIDATION_FAILED', // 422
  'UNAUTHENTICATED', // 401 — missing or unknown session
  'SESSION_EXPIRED', // 401 — session existed but expired
  'INVALID_CREDENTIALS', // 401 — login failed
  'FORBIDDEN', // 403 — authenticated but not allowed
  'NOT_FOUND', // 404
  'CONFLICT', // 409 — generic (e.g. e-mail already in use)
  'AVAILABILITY_CONFLICT', // 409 — edition sold out / not enough supply
  'QUOTE_CHANGED', // 409 — prices, availability, coupon or fees changed
  'IDEMPOTENCY_CONFLICT', // 409 — same Idempotency-Key, different payload
  'COUPON_INVALID', // 422
  'COUPON_EXPIRED', // 422
  'WALLET_REJECTED', // 409 — the user refused the request in the wallet
  'PAYMENT_DECLINED', // 402
  'RATE_LIMITED', // 429
  'SERVICE_UNAVAILABLE', // 503 — transient
  'INTERNAL_ERROR', // 500
])
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    status: z.number().int(),
    retryable: z.boolean().default(false),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>

export const imageSchema = z.object({
  src: z.string(),
  srcSetAvif: z.string(),
  srcSetWebp: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  alt: z.string(),
  dominantColor: z.string(),
})
export type Image = z.infer<typeof imageSchema>
