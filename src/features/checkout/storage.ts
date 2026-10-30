import type { CreateOrderRequest, WalletSession } from '@/api/contracts'
import { session } from '@/lib/storage'
import { DRAFT_PREFIX } from '@/features/auth/session'

/**
 * Checkout state that must survive a refresh or a session expiry in this tab
 * (sessionStorage, keyed by user so another account never sees it).
 */
const key = (name: string, userId: string) => `${DRAFT_PREFIX}${name}.${userId}`

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(
        (field) =>
          `${JSON.stringify(field)}:${stableStringify((value as Record<string, unknown>)[field])}`,
      )
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export const checkoutDraft = {
  load: <T>(userId: string) => session.get<T>(key('checkout', userId)),
  save: (userId: string, values: unknown) => session.set(key('checkout', userId), values),
  clear: (userId: string) => session.remove(key('checkout', userId)),
}

export const walletSessionDraft = {
  load: (userId: string) => session.get<WalletSession>(key('wallet-session', userId)),
  save: (userId: string, value: WalletSession) => session.set(key('wallet-session', userId), value),
  clear: (userId: string) => session.remove(key('wallet-session', userId)),
}

interface StoredAttempt {
  key: string
  fingerprint: string
  body: CreateOrderRequest
}

/**
 * Idempotency for order submission: the same payload always reuses the same key (double
 * clicks, retries after a timeout, a refresh mid-request), while a different payload gets a
 * fresh key so it never collides with a previous attempt.
 */
export const orderAttempt = {
  keyFor(userId: string, body: CreateOrderRequest) {
    const fingerprint = stableStringify(body)
    const stored = session.get<StoredAttempt>(key('order-attempt', userId))
    if (stored?.fingerprint === fingerprint) return stored.key
    const fresh = crypto.randomUUID()
    session.set(key('order-attempt', userId), { key: fresh, fingerprint, body })
    return fresh
  },
  /** An attempt whose outcome is unknown (e.g. the tab was refreshed mid-request). */
  pending: (userId: string) => session.get<StoredAttempt>(key('order-attempt', userId)),
  clear: (userId: string) => session.remove(key('order-attempt', userId)),
}
