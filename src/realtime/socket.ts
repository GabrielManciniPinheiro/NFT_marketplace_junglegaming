import { io } from 'socket.io-client'
import { REALTIME_EVENTS, realtimeEventSchema, type RealtimeEvent } from '@/api/contracts'
import { env } from '@/config/env'

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'closed'

export interface RealtimeCallbacks {
  onEvent: (event: RealtimeEvent) => void
  onStatus: (status: RealtimeStatus) => void
  /** Fired on every connection after the first one: time to reconcile with REST. */
  onReconnect: () => void
}

/**
 * Opens a Socket.IO connection bound to one session token and returns its disposer.
 *
 * WebSocket-only transport: the mock server lives in MSW's WebSocket interception, which
 * cannot answer HTTP long-polling (see ARCHITECTURE.md › Tempo real).
 */
export function connectRealtime(token: string | null, callbacks: RealtimeCallbacks) {
  const socket = io(env.socketUrl, {
    transports: ['websocket'],
    auth: { token },
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 5_000,
    timeout: 8_000,
  })

  let connectedBefore = false

  socket.on('connect', () => {
    callbacks.onStatus('connected')
    if (connectedBefore) callbacks.onReconnect()
    connectedBefore = true
  })
  socket.on('disconnect', (reason) => {
    callbacks.onStatus(reason === 'io client disconnect' ? 'closed' : 'reconnecting')
  })
  socket.on('connect_error', () =>
    callbacks.onStatus(connectedBefore ? 'reconnecting' : 'connecting'),
  )

  for (const type of Object.values(REALTIME_EVENTS)) {
    socket.on(type, (payload: unknown) => {
      const parsed = realtimeEventSchema.safeParse(payload)
      if (parsed.success) callbacks.onEvent(parsed.data)
      else if (import.meta.env.DEV)
        console.warn('[realtime] evento inválido', type, parsed.error.issues)
    })
  }

  return () => {
    socket.removeAllListeners()
    socket.io.removeAllListeners()
    socket.disconnect()
  }
}
