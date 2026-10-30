import { local } from '@/lib/storage'

/**
 * Client-side credentials: the opaque session token (Bearer) and the guest cart id.
 *
 * The token is an opaque, server-revocable identifier (never a password or a JWT with
 * user data). See ARCHITECTURE.md › Sessão for the trade-off versus httpOnly cookies.
 */
const TOKEN_KEY = 'kurio.session-token'
const GUEST_CART_KEY = 'kurio.guest-cart'

type Listener = (token: string | null) => void
const listeners = new Set<Listener>()

let token: string | null = local.get<string>(TOKEN_KEY)
let guestCartId: string | null = local.get<string>(GUEST_CART_KEY)

export const credentials = {
  getToken: () => token,

  setToken(next: string | null) {
    if (next === token) return
    token = next
    if (next) local.set(TOKEN_KEY, next)
    else local.remove(TOKEN_KEY)
    listeners.forEach((listener) => listener(next))
  },

  getGuestCartId: () => guestCartId,

  setGuestCartId(next: string | null) {
    guestCartId = next
    if (next) local.set(GUEST_CART_KEY, next)
    else local.remove(GUEST_CART_KEY)
  },

  /** Notified when the token changes in this tab or in another one. */
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== TOKEN_KEY) return
    token = local.get<string>(TOKEN_KEY)
    listeners.forEach((listener) => listener(token))
  })
}
