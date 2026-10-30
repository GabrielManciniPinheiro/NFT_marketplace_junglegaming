import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  changePasswordRequestSchema,
  createWalletRequestSchema,
  updateProfileRequestSchema,
  walletInputSchema,
  type WalletInput,
} from '@/api/contracts'
import { store, type UserRecord, type WalletRecord } from '../db/store'
import { REFERRAL_CODES } from '../fixtures/accounts'
import { fail, json, noContent, readJson, route } from '../lib/http'
import { createSalt, hashPassword, verifyPassword } from '../lib/password'
import { findUserByEmail, findUserByUsername } from './auth'

const toProfile = (user: UserRecord) => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  email: user.email,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  updatedAt: user.updatedAt,
})

const toWallet = ({ userId: _userId, ...wallet }: WalletRecord) => wallet

function userWallets(userId: string) {
  const wallets = Object.values(store.state.wallets).filter((wallet) => wallet.userId === userId)
  return {
    primary: wallets.find((wallet) => wallet.kind === 'primary') ?? null,
    secondary: wallets.find((wallet) => wallet.kind === 'secondary') ?? null,
  }
}

/** Rules only the server can check: referral codes and duplicated addresses. */
function validateWalletRules(userId: string, input: WalletInput, exceptId?: string) {
  const fieldErrors: Record<string, string[]> = {}
  if (!REFERRAL_CODES.includes(input.referralCode.trim().toUpperCase())) {
    fieldErrors.referralCode = ['Código de indicação não encontrado.']
  }
  const duplicate = Object.values(store.state.wallets).find(
    (wallet) =>
      wallet.userId === userId &&
      wallet.id !== exceptId &&
      wallet.address.toLowerCase() === input.address.trim().toLowerCase(),
  )
  if (duplicate)
    fieldErrors.address = [`Este endereço já está cadastrado na carteira "${duplicate.nickname}".`]
  if (fieldErrors.address) {
    throw fail(409, 'CONFLICT', 'Este endereço já está cadastrado.', { fieldErrors })
  }
  if (Object.keys(fieldErrors).length) {
    throw fail(422, 'VALIDATION_FAILED', 'Revise os campos destacados.', { fieldErrors })
  }
}

async function fileToDataUrl(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return `data:${file.type};base64,${btoa(binary)}`
}

export const accountHandlers = [
  route('get', '/profile', 'required', ({ auth }) => json(toProfile(auth.user))),

  route('patch', '/profile', 'required', async ({ auth, request }) => {
    const body = await readJson(request, updateProfileRequestSchema)
    const fieldErrors: Record<string, string[]> = {}
    if (findUserByEmail(body.email, auth.user.id))
      fieldErrors.email = ['Este e-mail já está em uso.']
    if (findUserByUsername(body.username, auth.user.id)) {
      fieldErrors.username = ['Este nome de usuário já está em uso.']
    }
    if (Object.keys(fieldErrors).length) {
      throw fail(409, 'CONFLICT', 'Alguns dados já pertencem a outra conta.', { fieldErrors })
    }
    Object.assign(auth.user, {
      displayName: body.displayName,
      username: body.username,
      email: body.email.toLowerCase(),
      bio: body.bio,
      updatedAt: new Date().toISOString(),
    })
    return json(toProfile(auth.user))
  }),

  route('put', '/profile/avatar', 'required', async ({ auth, request }) => {
    const form = await request.formData().catch(() => null)
    const file = form?.get('avatar')
    if (!(file instanceof File)) {
      throw fail(422, 'VALIDATION_FAILED', 'Envie uma imagem.', {
        fieldErrors: { avatar: ['Envie uma imagem.'] },
      })
    }
    if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
      throw fail(422, 'VALIDATION_FAILED', 'Formato não suportado.', {
        fieldErrors: { avatar: ['Use uma imagem PNG, JPG ou WebP.'] },
      })
    }
    if (file.size > AVATAR_MAX_BYTES) {
      throw fail(422, 'VALIDATION_FAILED', 'Imagem muito grande.', {
        fieldErrors: { avatar: ['A imagem deve ter no máximo 512 KB.'] },
      })
    }
    auth.user.avatarUrl = await fileToDataUrl(file)
    auth.user.updatedAt = new Date().toISOString()
    return json(toProfile(auth.user))
  }),

  route('delete', '/profile/avatar', 'required', ({ auth }) => {
    auth.user.avatarUrl = null
    auth.user.updatedAt = new Date().toISOString()
    return json(toProfile(auth.user))
  }),

  route('post', '/profile/password', 'required', async ({ auth, request }) => {
    const body = await readJson(request, changePasswordRequestSchema)
    const valid = await verifyPassword(
      body.currentPassword,
      auth.user.passwordSalt,
      auth.user.passwordHash,
    )
    if (!valid) {
      throw fail(422, 'VALIDATION_FAILED', 'Senha atual incorreta.', {
        fieldErrors: { currentPassword: ['Senha atual incorreta.'] },
      })
    }
    if (body.currentPassword === body.newPassword) {
      throw fail(422, 'VALIDATION_FAILED', 'Escolha uma senha diferente da atual.', {
        fieldErrors: { newPassword: ['A nova senha deve ser diferente da atual.'] },
      })
    }
    auth.user.passwordSalt = createSalt()
    auth.user.passwordHash = await hashPassword(body.newPassword, auth.user.passwordSalt)
    auth.user.updatedAt = new Date().toISOString()
    return noContent()
  }),

  route('get', '/wallets', 'required', ({ auth }) => {
    const { primary, secondary } = userWallets(auth.user.id)
    return json({
      primary: primary && toWallet(primary),
      secondary: secondary && toWallet(secondary),
    })
  }),

  route('post', '/wallets', 'required', async ({ auth, request }) => {
    const { kind, ...input } = await readJson(request, createWalletRequestSchema)
    if (userWallets(auth.user.id)[kind]) {
      throw fail(
        409,
        'CONFLICT',
        `Você já possui uma carteira ${kind === 'primary' ? 'principal' : 'secundária'}.`,
      )
    }
    if (kind === 'secondary' && !userWallets(auth.user.id).primary) {
      throw fail(422, 'VALIDATION_FAILED', 'Cadastre a carteira principal antes da secundária.')
    }
    validateWalletRules(auth.user.id, input)
    const now = new Date().toISOString()
    const wallet: WalletRecord = {
      ...input,
      referralCode: input.referralCode.toUpperCase(),
      id: store.nextId('wal'),
      userId: auth.user.id,
      kind,
      createdAt: now,
      updatedAt: now,
    }
    store.state.wallets[wallet.id] = wallet
    return json(toWallet(wallet), 201)
  }),

  route('put', '/wallets/:id', 'required', async ({ auth, request, params }) => {
    const wallet = store.state.wallets[params.id!]
    if (!wallet) throw fail(404, 'NOT_FOUND', 'Carteira não encontrada.')
    if (wallet.userId !== auth.user.id)
      throw fail(403, 'FORBIDDEN', 'Esta carteira pertence a outra conta.')
    const input = await readJson(request, walletInputSchema)
    validateWalletRules(auth.user.id, input, wallet.id)
    Object.assign(wallet, input, {
      referralCode: input.referralCode.toUpperCase(),
      updatedAt: new Date().toISOString(),
    })
    return json(toWallet(wallet))
  }),

  route('delete', '/wallets/:id', 'required', ({ auth, params }) => {
    const wallet = store.state.wallets[params.id!]
    if (!wallet) throw fail(404, 'NOT_FOUND', 'Carteira não encontrada.')
    if (wallet.userId !== auth.user.id)
      throw fail(403, 'FORBIDDEN', 'Esta carteira pertence a outra conta.')
    if (wallet.kind === 'primary') {
      throw fail(422, 'VALIDATION_FAILED', 'A carteira principal não pode ser removida.')
    }
    delete store.state.wallets[wallet.id]
    return noContent()
  }),
]
