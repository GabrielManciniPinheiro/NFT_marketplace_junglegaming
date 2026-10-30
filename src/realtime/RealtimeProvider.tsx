import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { useSessionToken } from '@/features/auth/session'
import { createEventProcessor, reconcileWithRest } from './processor'
import type { RealtimeStatus } from './socket'
import { RealtimeStatusContext } from './status'

/**
 * Owns the Socket.IO connection. It is recreated whenever the session token changes
 * (login, logout, expiry, user switch), so a connection — and its listeners — never
 * outlives the session that opened it.
 *
 * The client is imported lazily: engine.io-client captures the global `WebSocket` when its
 * module is evaluated, so it must load after the mock layer patched it (and it stays out
 * of the critical bundle).
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const token = useSessionToken()
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const [processor] = useState(() => createEventProcessor(queryClient))

  useEffect(() => {
    let disposed = false
    let dispose: (() => void) | undefined

    void import('./socket').then(({ connectRealtime }) => {
      if (disposed) return
      dispose = connectRealtime(token, {
        onEvent: processor.handle,
        onStatus: setStatus,
        onReconnect: () => reconcileWithRest(queryClient),
      })
    })

    return () => {
      disposed = true
      dispose?.()
      setStatus('connecting')
    }
  }, [token, processor, queryClient])

  return <RealtimeStatusContext value={status}>{children}</RealtimeStatusContext>
}
