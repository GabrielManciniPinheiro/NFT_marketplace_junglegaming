import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import type { AuthResponse, SessionInfo } from '@/api/contracts'
import { credentials } from '@/api/credentials'
import { authApi } from '@/api/endpoints'
import { isApiError } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { session as sessionStore } from '@/lib/storage'

export function sessionQueryOptions(token: string | null) {
  return queryOptions({
    queryKey: queryKeys.session(token),
    queryFn: ({ signal }): Promise<SessionInfo | null> =>
      token ? authApi.session(signal) : Promise.resolve(null),
    staleTime: 60_000,
    retry: (count, error) => isApiError(error) && error.retryable && count < 2,
  })
}

export function useSessionToken() {
  return useSyncExternalStore(credentials.subscribe, credentials.getToken, () => null)
}

/** Current session. `user` is null for visitors; `isResolving` while the token is checked. */
export function useSession() {
  const token = useSessionToken()
  const query = useQuery(sessionQueryOptions(token))
  return {
    token,
    user: query.data?.user ?? null,
    expiresAt: query.data?.expiresAt ?? null,
    isResolving: Boolean(token) && query.isPending,
    error: query.error,
  }
}

/** Used by route guards: resolves the session from cache or the API, never throws. */
export async function ensureSession(queryClient: QueryClient) {
  const token = credentials.getToken()
  if (!token) return null
  try {
    const info = await queryClient.ensureQueryData(sessionQueryOptions(token))
    return info?.user ?? null
  } catch {
    return null
  }
}

/** Keys of drafts kept across a session expiry (e.g. the checkout form). */
export const DRAFT_PREFIX = 'kurio.draft.'

/** Starts a session after login/register: no cached data from a previous user survives. */
export function startSession(queryClient: QueryClient, auth: AuthResponse) {
  queryClient.removeQueries({ queryKey: queryKeys.private.all })
  queryClient.removeQueries({ queryKey: queryKeys.guestCart() })
  queryClient.removeQueries({ queryKey: ['session'] })
  credentials.setGuestCartId(null)
  queryClient.setQueryData(queryKeys.session(auth.session.token), {
    user: auth.session.user,
    expiresAt: auth.session.expiresAt,
  })
  credentials.setToken(auth.session.token)
}

/**
 * Ends the session (logout, expiry, revocation): drops the token, every private query
 * and the session cache. Realtime subscriptions follow the token change.
 */
export function endSession(queryClient: QueryClient, { keepDrafts = false } = {}) {
  credentials.setToken(null)
  queryClient.removeQueries({ queryKey: queryKeys.private.all })
  queryClient.removeQueries({ queryKey: ['session'] })
  queryClient.setQueryData(queryKeys.session(null), null)
  if (!keepDrafts) {
    try {
      Object.keys(window.sessionStorage)
        .filter((key) => key.startsWith(DRAFT_PREFIX))
        .forEach((key) => sessionStore.remove(key))
    } catch {
      /* ignore */
    }
  }
}

/** Only same-origin paths are accepted as post-login destinations (no open redirects). */
export function safeRedirect(value: unknown, fallback = '/') {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : fallback
}
