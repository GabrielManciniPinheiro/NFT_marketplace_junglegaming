import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { networkReady } from '@/app/network-gate'
import { env } from '@/config/env'
import { apiErrorBodySchema } from './contracts'
import { credentials } from './credentials'
import { ApiError, clientError } from './errors'

export const DEFAULT_TIMEOUT_MS = 10_000

export const http = axios.create({
  baseURL: env.apiUrl,
  headers: { Accept: 'application/json' },
})

/* ─── Session invalidation signal ─────────────────────────────────────────── */

export type SessionInvalidReason = 'expired' | 'unauthenticated'
type SessionInvalidHandler = (reason: SessionInvalidReason) => void
const sessionInvalidHandlers = new Set<SessionInvalidHandler>()

/** Fired when an authenticated request is rejected with 401 (expired/revoked session). */
export function onSessionInvalid(handler: SessionInvalidHandler) {
  sessionInvalidHandlers.add(handler)
  return () => {
    sessionInvalidHandlers.delete(handler)
  }
}

/* ─── Interceptors ────────────────────────────────────────────────────────── */

http.interceptors.request.use((config) => {
  const token = credentials.getToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  } else {
    const guestCartId = credentials.getGuestCartId()
    if (guestCartId) config.headers.set('X-Guest-Cart', guestCartId)
  }
  return config
})

function toApiError(error: AxiosError): ApiError {
  const { response } = error
  if (!response) return clientError('NETWORK_ERROR')

  const parsed = apiErrorBodySchema.safeParse(response.data)
  if (parsed.success) {
    const body = parsed.data.error
    return new ApiError({
      ...body,
      status: response.status,
      requestId: body.requestId ?? (response.headers['x-request-id'] as string | undefined),
    })
  }

  return new ApiError({
    code: response.status >= 500 ? 'INTERNAL_ERROR' : 'INVALID_RESPONSE',
    status: response.status,
    message:
      response.status >= 500
        ? 'Erro interno do servidor. Tente novamente.'
        : 'Recebemos uma resposta inesperada do servidor.',
    retryable: response.status >= 500,
  })
}

http.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isCancel(error) || !(error instanceof AxiosError)) throw error

  const apiError = toApiError(error)
  const sentToken = Boolean(error.config?.headers.has('Authorization'))
  if (sentToken && apiError.isAuthError) {
    const reason: SessionInvalidReason = apiError.is('SESSION_EXPIRED')
      ? 'expired'
      : 'unauthenticated'
    sessionInvalidHandlers.forEach((handler) => handler(reason))
  }
  throw apiError
})

/* ─── Typed request helpers ───────────────────────────────────────────────── */

export interface RequestOptions extends Omit<AxiosRequestConfig, 'signal' | 'timeout'> {
  signal?: AbortSignal
  /** Client-side deadline, implemented with setTimeout so tests can drive it with a fake clock. */
  timeoutMs?: number
}

class RequestTimeout extends Error {}

async function send(options: RequestOptions) {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS, ...config } = options
  await networkReady
  const deadline = new AbortController()
  const timer = setTimeout(() => deadline.abort(new RequestTimeout()), timeoutMs)
  const combined = signal ? AbortSignal.any([signal, deadline.signal]) : deadline.signal

  try {
    return await http.request({ ...config, signal: combined })
  } catch (error) {
    if (deadline.signal.aborted && !signal?.aborted) throw clientError('TIMEOUT')
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/** Performs a request and validates the payload against its contract schema. */
export async function request<S extends z.ZodType>(
  schema: S,
  options: RequestOptions,
): Promise<z.output<S>> {
  const response = await send(options)
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) {
    if (import.meta.env.DEV)
      console.error('[api] contract violation', options.url, parsed.error.issues)
    throw clientError('INVALID_RESPONSE', response.status, parsed.error.issues)
  }
  return parsed.data
}

/** For endpoints answering 204 No Content. */
export async function requestVoid(options: RequestOptions): Promise<void> {
  await send(options)
}

export { toSearchParams } from '@/lib/search-params'
