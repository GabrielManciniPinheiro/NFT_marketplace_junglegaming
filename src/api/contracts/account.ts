import { z } from 'zod'
import { isoDateSchema, networkSchema } from './common'
import { emailSchema, passwordSchema, usernameSchema } from './auth'

/* ─── Profile ─────────────────────────────────────────────────────────────── */

export const profileSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  email: z.string(),
  bio: z.string(),
  avatarUrl: z.string().nullable(),
  updatedAt: isoDateSchema,
})
export type Profile = z.infer<typeof profileSchema>

export const updateProfileRequestSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Informe ao menos 2 caracteres')
    .max(40, 'Máximo de 40 caracteres'),
  username: usernameSchema,
  email: emailSchema,
  bio: z.string().trim().max(280, 'Máximo de 280 caracteres'),
})
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: passwordSchema,
})
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>

export const AVATAR_MAX_BYTES = 512 * 1024
export const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

/* ─── Wallets ─────────────────────────────────────────────────────────────── */

export const walletKindSchema = z.enum(['primary', 'secondary'])
export type WalletKind = z.infer<typeof walletKindSchema>

export const walletProviderSchema = z.enum(['walletconnect', 'metamask', 'coinbase'])
export type WalletProvider = z.infer<typeof walletProviderSchema>

export const WALLET_PROVIDER_LABEL: Record<WalletProvider, string> = {
  walletconnect: 'WalletConnect',
  metamask: 'MetaMask',
  coinbase: 'Coinbase Wallet',
}

export const ensSuffixSchema = z.enum(['.eth', '.kurio.eth'])
export type EnsSuffix = z.infer<typeof ensSuffixSchema>

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export function isValidAddress(network: z.infer<typeof networkSchema>, address: string) {
  return network === 'solana' ? SOLANA_ADDRESS.test(address) : EVM_ADDRESS.test(address)
}

const requiredNetworkSchema = z.enum(networkSchema.options, { error: 'Selecione uma rede' })
const requiredProviderSchema = z.enum(walletProviderSchema.options, {
  error: 'Selecione uma carteira',
})

/** Fields shared by the wallet form (Carteiras) and the collector form (Pagamento). */
export const walletFieldsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Informe o nome de exibição')
    .max(40, 'Máximo de 40 caracteres'),
  network: requiredNetworkSchema,
  profileName: z
    .string()
    .trim()
    .min(2, 'Informe o nome do perfil')
    .max(40, 'Máximo de 40 caracteres'),
  address: z.string().trim().min(1, 'Informe o endereço da carteira'),
  secondaryAddress: z.string().trim().max(64, 'Máximo de 64 caracteres'),
  provider: requiredProviderSchema,
  referralCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{4,12}$/, 'Use de 4 a 12 letras ou números'),
  email: emailSchema,
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,32}$/, 'Use de 3 a 32 letras minúsculas, números ou hífen'),
  ensSuffix: ensSuffixSchema,
})

export const walletInputBaseSchema = walletFieldsSchema.extend({
  nickname: z.string().trim().min(2, 'Informe um apelido').max(24, 'Máximo de 24 caracteres'),
})

const refineAddress = (
  value: { network: z.infer<typeof networkSchema>; address: string },
  ctx: z.RefinementCtx,
) => {
  if (value.network && !isValidAddress(value.network, value.address)) {
    ctx.addIssue({
      code: 'custom',
      path: ['address'],
      message:
        value.network === 'solana'
          ? 'Endereço Solana inválido (base58, 32 a 44 caracteres)'
          : 'Use 0x seguido de 40 caracteres hexadecimais',
    })
  }
}

export const walletInputSchema = walletInputBaseSchema.superRefine(refineAddress)
export type WalletInput = z.infer<typeof walletInputSchema>

export const createWalletRequestSchema = walletInputBaseSchema
  .extend({ kind: walletKindSchema })
  .superRefine(refineAddress)
export type CreateWalletRequest = z.infer<typeof createWalletRequestSchema>

export const walletSchema = walletInputBaseSchema.extend({
  id: z.string(),
  kind: walletKindSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})
export type Wallet = z.infer<typeof walletSchema>

export const walletsResponseSchema = z.object({
  primary: walletSchema.nullable(),
  secondary: walletSchema.nullable(),
})
export type WalletsResponse = z.infer<typeof walletsResponseSchema>

/* ─── Wallet connection (simulated provider handshake) ────────────────────── */

export const connectWalletRequestSchema = z.object({
  walletId: z.string(),
  provider: walletProviderSchema,
  network: networkSchema,
})
export type ConnectWalletRequest = z.infer<typeof connectWalletRequestSchema>

export const walletSessionSchema = z.object({
  id: z.string(),
  walletId: z.string(),
  provider: walletProviderSchema,
  network: networkSchema,
  address: z.string(),
  connectedAt: isoDateSchema,
})
export type WalletSession = z.infer<typeof walletSessionSchema>
