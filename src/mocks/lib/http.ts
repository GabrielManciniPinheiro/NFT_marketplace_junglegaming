import { delay, http, HttpResponse, type JsonBodyType } from 'msw'
import type { z } from 'zod'
import type { ApiErrorCode } from '@/api/contracts'
import { env } from '@/config/env'
import { mockConfig, type MockConfig } from '../config'
import { store, type SessionRecord, type UserRecord } from '../db/store'
import { createRandom } from './random'

export const API = env.apiUrl.replace(/\/$/, '')

/* ─── Errors ──────────────────────────────────────────────────────────────── */

interface ErrorExtra {
  fieldErrors?: Record<string, string[]>
  details?: unknown
  retryable?: boolean
}

export class MockHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly extra: ErrorExtra = {},
  ) {
    super(message)
  }
}

export const fail = (status: number, code: ApiErrorCode, message: string, extra?: ErrorExtra) =>
  new MockHttpError(status, code, message, extra)

let requestCounter = 0

export function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: ErrorExtra = {},
) {
  const requestId = `req_${(++requestCounter).toString(36)}`
  return HttpResponse.json(
    {
      error: {
        code,
        message,
        status,
        retryable: extra.retryable ?? (status >= 500 || status === 429),
        fieldErrors: extra.fieldErrors,
        details: extra.details,
        requestId,
      },
    },
    { status, headers: { 'X-Request-Id': requestId } },
  )
}

export const json = (body: JsonBodyType, status = 200, headers?: Record<string, string>) =>
  HttpResponse.json(body, { status, headers })

export const noContent = () => new HttpResponse(null, { status: 204 })

export function toFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return fieldErrors
}

export async function readJson<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw fail(422, 'VALIDATION_FAILED', 'O corpo da requisição não é um JSON válido.')
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw fail(422, 'VALIDATION_FAILED', 'Revise os campos destacados.', {
      fieldErrors: toFieldErrors(parsed.error),
    })
  }
  return parsed.data
}

/* ─── Network simulation ──────────────────────────────────────────────────── */

let sequence = 0
const failuresByRoute = new Map<string, number>()
mockConfig.subscribe(() => {
  failuresByRoute.clear()
  sequence = 0
})

function latencyFor(config: MockConfig, method: string, seq: number) {
  const { mode, baseMs, jitterMs } = config.latency
  switch (mode) {
    case 'none':
      return 0
    case 'fixed':
      return baseMs
    case 'variable':
      return Math.round(baseMs + createRandom(config.seed * 10_007 + seq).next() * jitterMs)
    case 'out-of-order':
      // Odd reads are slow, even reads are fast: a later request overtakes the earlier one.
      return method === 'GET' && seq % 2 === 1 ? baseMs + jitterMs : baseMs
  }
}

/** Applies latency and fault injection. Returns a response when the request must fail. */
async function simulateNetwork(method: string, routeKey: string): Promise<Response | null> {
  const config = mockConfig.get()
  const { failure } = config
  const inScope = failure.scope === 'all' || method === 'GET'

  if (inScope && failure.mode === 'offline') return HttpResponse.error()

  const seq = ++sequence
  const ms = latencyFor(config, method, seq)
  if (ms > 0) await delay(ms)

  if (!inScope) return null
  if (failure.mode === 'server-error') {
    return errorResponse(500, 'INTERNAL_ERROR', 'Erro interno simulado no servidor.', {
      retryable: true,
    })
  }
  if (failure.mode === 'flaky') {
    const attempts = (failuresByRoute.get(routeKey) ?? 0) + 1
    failuresByRoute.set(routeKey, attempts)
    if (attempts <= failure.failuresPerRoute) {
      return errorResponse(
        503,
        'SERVICE_UNAVAILABLE',
        'Serviço temporariamente indisponível. Tente novamente.',
        {
          retryable: true,
        },
      )
    }
  }
  return null
}

/* ─── Auth ────────────────────────────────────────────────────────────────── */

export interface AuthContext {
  user: UserRecord
  session: SessionRecord
}

export function bearerToken(request: Request) {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

function resolveAuth(request: Request, required: boolean): AuthContext | null {
  const token = bearerToken(request)
  if (!token) {
    if (required) throw fail(401, 'UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    return null
  }
  const session = store.state.sessions[token]
  const user = session ? store.state.users[session.userId] : undefined
  if (!session || !user) throw fail(401, 'UNAUTHENTICATED', 'Sessão inválida. Entre novamente.')
  if (session.expiresAt <= Date.now()) {
    throw fail(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  }
  return { user, session }
}

/* ─── Route wrapper ───────────────────────────────────────────────────────── */

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'
type AuthMode = 'none' | 'optional' | 'required'

export interface RouteContext<A extends AuthMode> {
  request: Request
  params: Record<string, string>
  url: URL
  auth: A extends 'required' ? AuthContext : AuthContext | null
}

/**
 * Declares a REST handler: syncs the store, simulates the network, resolves the session,
 * maps thrown MockHttpErrors to the error envelope and persists writes.
 */
export function route<A extends AuthMode>(
  method: Method,
  path: string,
  auth: A,
  resolver: (context: RouteContext<A>) => Response | Promise<Response>,
) {
  const routeKey = `${method.toUpperCase()} ${path}`
  return http[method](`${API}${path}`, async ({ request, params }) => {
    store.sync()
    const simulated = await simulateNetwork(method.toUpperCase(), routeKey)
    if (simulated) return simulated

    try {
      const context = {
        request,
        params: params as Record<string, string>,
        url: new URL(request.url),
        auth: auth === 'none' ? null : resolveAuth(request, auth === 'required'),
      } as RouteContext<A>
      return await resolver(context)
    } catch (error) {
      if (error instanceof MockHttpError) {
        return errorResponse(error.status, error.code, error.message, error.extra)
      }
      console.error('[mock] erro inesperado em', routeKey, error)
      return errorResponse(500, 'INTERNAL_ERROR', 'Erro inesperado no servidor simulado.')
    } finally {
      if (method !== 'get') store.commit()
    }
  })
}
