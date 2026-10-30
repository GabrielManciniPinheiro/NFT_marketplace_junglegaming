import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws, type WebSocketHandlerConnection } from 'msw'
import type { RealtimeEvent } from '@/api/contracts'
import { env } from '@/config/env'
import { store } from '../db/store'

/**
 * Socket.IO server simulated on top of MSW's WebSocket interception.
 *
 * Transport notes (see ARCHITECTURE.md › Tempo real):
 * - MSW only intercepts WebSocket, so the client must use `transports: ['websocket']`
 *   (no HTTP long-polling handshake/upgrade).
 * - The binding answers the Engine.IO/Socket.IO handshake by itself but never sends
 *   heartbeats; without pings the client drops with "ping timeout" every ~30 s, so this
 *   server sends Engine.IO pings ("2") on its own.
 * - The binding ignores CONNECT packets, so the `auth` payload is read from the raw
 *   "40{...}" frame to bind the connection to a session.
 * - No rooms/namespaces/acks: private delivery is done by filtering peers per user.
 * - MSW strips the "/socket.io/" path prefix from client URLs before matching, so the
 *   link points at the origin only (e.g. wss://realtime.kurio.mock).
 */

const PING_INTERVAL_MS = 20_000
const realtime = ws.link(env.socketUrl.replace(/\/$/, ''))

interface Peer {
  id: string
  token: string | null
  io: ReturnType<typeof toSocketIo>
  connection: WebSocketHandlerConnection
  heartbeat: ReturnType<typeof setInterval>
}

const peers = new Map<string, Peer>()
let outageUntil = 0
const statusListeners = new Set<() => void>()
const notify = () => statusListeners.forEach((listener) => listener())

function parseConnectAuth(data: unknown): string | null {
  if (typeof data !== 'string' || !data.startsWith('40')) return null
  try {
    const payload = JSON.parse(data.slice(2) || '{}') as { token?: unknown }
    return typeof payload.token === 'string' ? payload.token : null
  } catch {
    return null
  }
}

/** Resolves the user bound to a peer at delivery time (sessions may expire or be revoked). */
function peerUserId(peer: Peer) {
  if (!peer.token) return null
  const session = store.state.sessions[peer.token]
  if (!session || session.expiresAt <= Date.now()) return null
  return session.userId
}

/**
 * Mimics an unreachable server: the handshake fails with an `error` before `close`.
 * A clean close before the Engine.IO handshake would leave socket.io-client's Manager
 * waiting forever, while an error makes it schedule the next reconnection attempt.
 */
function refuse(client: WebSocketHandlerConnection['client']) {
  const socket = (client as { socket?: WebSocket }).socket
  socket?.dispatchEvent(new Event('error'))
  client.close(4000, 'Servidor de tempo real indisponível (simulação)')
}

export const realtimeHandler = realtime.addEventListener('connection', (connection) => {
  const { client } = connection

  if (Date.now() < outageUntil) {
    refuse(client)
    return
  }

  const peer: Peer = {
    id: client.id,
    token: null,
    io: toSocketIo(connection),
    connection,
    heartbeat: setInterval(() => client.send('2'), PING_INTERVAL_MS),
  }
  peers.set(peer.id, peer)
  notify()

  client.addEventListener('message', (event) => {
    const token = parseConnectAuth(event.data)
    if (token !== null || (typeof event.data === 'string' && event.data.startsWith('40'))) {
      peer.token = token
    }
  })

  client.addEventListener('close', () => {
    clearInterval(peer.heartbeat)
    peers.delete(peer.id)
    notify()
  })
})

function deliver(peer: Peer, event: RealtimeEvent) {
  peer.io.client.emit(event.type, event)
}

/** Public catalog events (every connected client). */
export function broadcast(event: RealtimeEvent) {
  for (const peer of peers.values()) deliver(peer, event)
}

/** Private events: only peers whose current session belongs to `userId`. */
export function emitToUser(userId: string, event: RealtimeEvent) {
  for (const peer of peers.values()) {
    if (peerUserId(peer) === userId) deliver(peer, event)
  }
}

/** Closes every connection and refuses new ones for `outageMs` (simulated outage). */
export function dropConnections(outageMs = 0) {
  outageUntil = Date.now() + outageMs
  for (const peer of [...peers.values()]) {
    peer.connection.client.close(4001, 'Conexão encerrada pelo servidor (simulação)')
  }
  notify()
}

export function realtimeStatus() {
  return {
    connections: peers.size,
    authenticated: [...peers.values()].filter((peer) => peerUserId(peer)).length,
    outageUntil,
  }
}

export function onRealtimeStatusChange(listener: () => void) {
  statusListeners.add(listener)
  return () => {
    statusListeners.delete(listener)
  }
}
