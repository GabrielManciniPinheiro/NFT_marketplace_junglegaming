import type { EditionId, RealtimeEvent } from '@/api/contracts'
import { eth } from '@/lib/eth'
import { mockConfig, SCENARIOS, type MockConfig, type ScenarioId } from './config'
import { clearPersistedDb, store } from './db/store'
import { buildNftUpdatedEvent, editionsOf, updateNft, type NftPatch } from './domain/catalog'
import { pendingOrders, settleOrder } from './domain/commerce'
import { broadcast, dropConnections, emitToUser, realtimeStatus } from './realtime/server'

/** Removes every `kurio.*` key (mock database, mock config and the app's session/cart ids). */
export function clearKurioStorage() {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      Object.keys(storage)
        .filter((key) => key.startsWith('kurio.'))
        .forEach((key) => storage.removeItem(key))
    } catch {
      /* ignore */
    }
  }
}

function deliver(event: RealtimeEvent) {
  if (event.type === 'order.updated') emitToUser(event.userId, event)
  else broadcast(event)
}

function defaultEdition(nftId: string) {
  const nft = store.getNft(nftId)
  if (!nft) throw new Error(`NFT inexistente: ${nftId}`)
  const edition = editionsOf(nft.fixture, nft.state).find(
    (item) => item.id === nft.fixture.defaultEdition,
  )!
  return { nft, edition }
}

/**
 * Control surface of the simulated backend. Every action mutates the mock database and,
 * when relevant, publishes through the Socket.IO server — the UI only ever learns about
 * changes through REST responses and socket events.
 */
export const mockControl = {
  scenarios: () =>
    Object.entries(SCENARIOS).map(([id, scenario]) => ({
      id: id as ScenarioId,
      label: scenario.label,
      description: scenario.description,
    })),
  getConfig: () => mockConfig.get(),
  setScenario: (id: ScenarioId) => mockConfig.applyScenario(id),
  setConfig: (patch: Partial<MockConfig>) => mockConfig.set(patch),

  /** Restores the seed and the default scenario, signs the visitor out and reloads. */
  async reset({ reload = true }: { reload?: boolean } = {}) {
    clearKurioStorage()
    clearPersistedDb()
    mockConfig.reset()
    await store.reset()
    if (reload) window.location.reload()
  },

  /* catalog → nft.updated */
  updateNft: (nftId: string, patch: NftPatch) => updateNft(nftId, patch),
  changePrice(nftId: string, percent: number, edition?: EditionId) {
    const { nft, edition: featured } = defaultEdition(nftId)
    const target = edition
      ? editionsOf(nft.fixture, nft.state).find((item) => item.id === edition)
      : featured
    if (!target) throw new Error(`Edição inexistente: ${edition}`)
    return updateNft(nftId, {
      edition: target.id,
      price: eth.bps(target.price, 10_000 + percent * 100),
    })
  },
  sellOut: (nftId: string, edition?: EditionId) => updateNft(nftId, { edition, available: 0 }),
  restock: (nftId: string, available = 25, edition?: EditionId) =>
    updateNft(nftId, { edition, available }),

  /* realtime delivery anomalies */
  replayLastEvent() {
    const event = store.state.recentEvents.at(-1)
    if (event) deliver(event)
    return event ?? null
  },
  emitStaleNftEvent(nftId: string) {
    const fresh = buildNftUpdatedEvent(nftId)
    const stale = {
      ...fresh,
      version: Math.max(1, fresh.version - 1),
      data: { ...fresh.data, price: eth.bps(fresh.data.price, 5_000) },
    } as typeof fresh
    broadcast(stale)
    return stale
  },
  dropRealtime: (outageMs = 8_000) => dropConnections(outageMs),
  realtimeStatus,

  /* sessions, wallets and orders */
  expireSessions() {
    for (const session of Object.values(store.state.sessions)) session.expiresAt = Date.now() - 1
    store.commit()
  },
  disconnectWallets() {
    const now = new Date().toISOString()
    for (const session of Object.values(store.state.walletSessions)) session.disconnectedAt ??= now
    store.commit()
  },
  expireCoupon(code: string) {
    const coupon = store.state.coupons[code.toUpperCase()]
    if (coupon) coupon.expiresAt = new Date(Date.now() - 1).toISOString()
    store.commit()
  },
  pendingOrders: () => pendingOrders().map((record) => record.order),
  settleOrder: (orderId: string, outcome: 'confirm' | 'decline') => settleOrder(orderId, outcome),
  settlePendingOrders(outcome?: 'confirm' | 'decline') {
    return pendingOrders().map((record) => settleOrder(record.order.id, outcome))
  },

  /** Read-only snapshot for debugging. */
  snapshot: () => structuredClone(store.state),
}

export type MockControl = typeof mockControl

declare global {
  interface Window {
    __kurioMock?: MockControl
  }
}
