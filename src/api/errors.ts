import type { ApiErrorCode } from './contracts'

/** Failures detected by the client itself (no usable HTTP response). */
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE'
export type ErrorCode = ApiErrorCode | ClientErrorCode

export interface ApiErrorInit {
  code: ErrorCode
  message: string
  status: number | null
  retryable: boolean
  fieldErrors?: Record<string, string[]>
  details?: unknown
  requestId?: string
}

/** Every rejected API call surfaces as an ApiError (validated envelope or client failure). */
export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number | null
  readonly retryable: boolean
  readonly fieldErrors: Record<string, string[]>
  readonly details: unknown
  readonly requestId?: string

  constructor(init: ApiErrorInit) {
    super(init.message)
    this.name = 'ApiError'
    this.code = init.code
    this.status = init.status
    this.retryable = init.retryable
    this.fieldErrors = init.fieldErrors ?? {}
    this.details = init.details
    this.requestId = init.requestId
  }

  is(...codes: ErrorCode[]) {
    return codes.includes(this.code)
  }

  get isAuthError() {
    return this.is('UNAUTHENTICATED', 'SESSION_EXPIRED')
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

const FALLBACK_MESSAGE: Partial<Record<ErrorCode, string>> = {
  NETWORK_ERROR: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
  TIMEOUT: 'O servidor demorou para responder. Tente novamente.',
  INVALID_RESPONSE: 'Recebemos uma resposta inesperada do servidor.',
  SERVICE_UNAVAILABLE: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
  INTERNAL_ERROR: 'Erro interno do servidor. Tente novamente.',
}

export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.') {
  if (isApiError(error)) return error.message || FALLBACK_MESSAGE[error.code] || fallback
  return fallback
}

export function clientError(
  code: ClientErrorCode,
  status: number | null = null,
  details?: unknown,
) {
  return new ApiError({
    code,
    status,
    message: FALLBACK_MESSAGE[code] ?? 'Falha na comunicação com o servidor.',
    retryable: code !== 'INVALID_RESPONSE',
    details,
  })
}
