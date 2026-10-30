import { loginRequestSchema, registerRequestSchema } from '@/api/contracts'
import { mockConfig } from '../config'
import { store, type UserRecord } from '../db/store'
import { mergeGuestCart, userCart } from '../domain/commerce'
import { bearerToken, fail, json, noContent, readJson, route } from '../lib/http'
import { createSalt, hashPassword, verifyPassword } from '../lib/password'

export const toUser = (user: UserRecord) => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  email: user.email,
  avatarUrl: user.avatarUrl,
})

function openSession(user: UserRecord) {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  const token = `tok_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
  const now = Date.now()
  const expiresAt = now + mockConfig.get().sessionTtlSec * 1000
  store.state.sessions[token] = { token, userId: user.id, createdAt: now, expiresAt }
  return { token, expiresAt: new Date(expiresAt).toISOString(), user: toUser(user) }
}

export function findUserByEmail(email: string, exceptId?: string) {
  const normalized = email.trim().toLowerCase()
  return Object.values(store.state.users).find(
    (user) => user.email.toLowerCase() === normalized && user.id !== exceptId,
  )
}

export function findUserByUsername(username: string, exceptId?: string) {
  const normalized = username.trim().toLowerCase()
  return Object.values(store.state.users).find(
    (user) => user.username.toLowerCase() === normalized && user.id !== exceptId,
  )
}

export const authHandlers = [
  route('post', '/auth/register', 'none', async ({ request }) => {
    const body = await readJson(request, registerRequestSchema)

    const fieldErrors: Record<string, string[]> = {}
    if (findUserByEmail(body.email)) fieldErrors.email = ['Este e-mail já está cadastrado.']
    if (findUserByUsername(body.username))
      fieldErrors.username = ['Este nome de usuário já está em uso.']
    if (Object.keys(fieldErrors).length) {
      throw fail(409, 'CONFLICT', 'Já existe uma conta com esses dados.', { fieldErrors })
    }

    const now = new Date().toISOString()
    const salt = createSalt()
    const user: UserRecord = {
      id: store.nextId('usr'),
      username: body.username.trim(),
      displayName: body.username.trim(),
      email: body.email.trim().toLowerCase(),
      bio: '',
      avatarUrl: null,
      passwordSalt: salt,
      passwordHash: await hashPassword(body.password, salt),
      createdAt: now,
      updatedAt: now,
    }
    store.state.users[user.id] = user
    store.state.favorites[user.id] = []
    userCart(user.id)

    const cartMerge = mergeGuestCart(user.id, body.guestCartId)
    return json({ session: openSession(user), cartMerge }, 201)
  }),

  route('post', '/auth/login', 'none', async ({ request }) => {
    const body = await readJson(request, loginRequestSchema)
    const user = findUserByEmail(body.email)
    const valid = user
      ? await verifyPassword(body.password, user.passwordSalt, user.passwordHash)
      : false
    if (!user || !valid) throw fail(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')

    const cartMerge = mergeGuestCart(user.id, body.guestCartId)
    return json({ session: openSession(user), cartMerge })
  }),

  route('get', '/auth/session', 'required', ({ auth }) =>
    json({ user: toUser(auth.user), expiresAt: new Date(auth.session.expiresAt).toISOString() }),
  ),

  // Logout always succeeds, even with an expired token, and revokes it server-side.
  route('post', '/auth/logout', 'none', ({ request }) => {
    const token = bearerToken(request)
    if (token) delete store.state.sessions[token]
    return noContent()
  }),
]
