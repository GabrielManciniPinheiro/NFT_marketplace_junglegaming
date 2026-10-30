import { z } from 'zod'
import { isoDateSchema } from './common'

export const emailSchema = z.email({ error: 'Informe um e-mail válido' }).max(120)

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Use ao menos 3 caracteres')
  .max(24, 'Use no máximo 24 caracteres')
  .regex(/^[a-z0-9_.]+$/i, 'Use apenas letras, números, "." e "_"')

export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa ter ao menos 8 caracteres')
  .max(72, 'A senha pode ter no máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'Inclua ao menos uma letra')
  .regex(/\d/, 'Inclua ao menos um número')

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  token: z.string(),
  expiresAt: isoDateSchema,
  user: userSchema,
})
export type Session = z.infer<typeof sessionSchema>

/** GET /auth/session — resolves the bearer token into the current user. */
export const sessionInfoSchema = z.object({
  user: userSchema,
  expiresAt: isoDateSchema,
})
export type SessionInfo = z.infer<typeof sessionInfoSchema>

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha'),
  /** Guest cart to merge into the account cart. */
  guestCartId: z.string().optional(),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

export const registerRequestSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  guestCartId: z.string().optional(),
})
export type RegisterRequest = z.infer<typeof registerRequestSchema>

export const cartMergeReportSchema = z.object({
  mergedLines: z.number().int().min(0),
  adjusted: z.array(
    z.object({
      name: z.string(),
      editionLabel: z.string(),
      requested: z.number().int(),
      kept: z.number().int(),
    }),
  ),
})
export type CartMergeReport = z.infer<typeof cartMergeReportSchema>

export const authResponseSchema = z.object({
  session: sessionSchema,
  cartMerge: cartMergeReportSchema.nullable(),
})
export type AuthResponse = z.infer<typeof authResponseSchema>
