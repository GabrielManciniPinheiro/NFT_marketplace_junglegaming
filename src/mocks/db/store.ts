import type { z } from 'zod'
import type {
  EditionId,
  EnsSuffix,
  Network,
  orderSchema,
  quoteSchema,
  RealtimeEvent,
  WalletKind,
  WalletProvider,
} from '@/api/contracts'
import { buildCatalog, type NftFixture } from '../fixtures/catalog'
import { COUPON_SEEDS, USER_SEEDS } from '../fixtures/accounts'
import { createSalt, hashPassword } from '../lib/password'

/* ─── Records ─────────────────────────────────────────────────────────────── */

export type QuoteDto = z.input<typeof quoteSchema>
export type OrderDto = z.input<typeof orderSchema>

export interface NftState {
  editions: Partial<Record<EditionId, { price: string; available: number }>>
  previousPrice: string | null
  version: number
}

export interface UserRecord {
  id: string
  username: string
  displayName: string
  email: string
  bio: string
  avatarUrl: string | null
  passwordSalt: string
  passwordHash: string
  createdAt: string
  updatedAt: string
}

export interface SessionRecord {
  token: string
  userId: string
  createdAt: number
  expiresAt: number
}

export interface CartLineRecord {
  id: string
  nftId: string
  edition: EditionId
  quantity: number
  /** Last price the collector saw for this line (drives `priceChange`). */
  seenPrice: string
  addedAt: string
}

export interface CartRecord {
  id: string
  userId: string | null
  lines: CartLineRecord[]
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface WalletRecord {
  id: string
  userId: string
  kind: WalletKind
  displayName: string
  nickname: string
  network: Network
  profileName: string
  address: string
  secondaryAddress: string
  provider: WalletProvider
  referralCode: string
  email: string
  ensName: string
  ensSuffix: EnsSuffix
  createdAt: string
  updatedAt: string
}

export interface WalletSessionRecord {
  id: string
  userId: string
  walletId: string
  provider: WalletProvider
  network: Network
  address: string
  connectedAt: string
  disconnectedAt: string | null
}

export interface CouponRecord {
  code: string
  label: string
  percentBps: number
  expiresAt: string
}

export interface QuoteRecord {
  quote: QuoteDto
  userId: string
  cartId: string
}

export interface OrderRecord {
  order: OrderDto
  settleAt: number | null
  reservation: { nftId: string; edition: EditionId; quantity: number }[]
}

export interface IdempotencyRecord {
  userId: string
  key: string
  fingerprint: string
  orderId: string
  createdAt: string
}

export interface DbState {
  schema: number
  seededAt: number
  nfts: Record<string, NftState>
  users: Record<string, UserRecord>
  sessions: Record<string, SessionRecord>
  carts: Record<string, CartRecord>
  favorites: Record<string, { nftId: string; addedAt: string }[]>
  wallets: Record<string, WalletRecord>
  walletSessions: Record<string, WalletSessionRecord>
  coupons: Record<string, CouponRecord>
  quotes: Record<string, QuoteRecord>
  orders: Record<string, OrderRecord>
  idempotency: Record<string, IdempotencyRecord>
  counters: { seq: number; order: number; event: number }
  recentEvents: RealtimeEvent[]
}

/* ─── Seed ────────────────────────────────────────────────────────────────── */

const SCHEMA = 1
const DB_KEY = 'kurio.mock.db'
const REV_KEY = 'kurio.mock.db.rev'

async function seed(catalog: NftFixture[]): Promise<DbState> {
  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  const nfts: DbState['nfts'] = {}
  for (const nft of catalog) {
    nfts[nft.id] = {
      editions: Object.fromEntries(
        nft.editions.map((edition) => [
          edition.id,
          { price: edition.price, available: edition.available },
        ]),
      ),
      previousPrice: nft.previousPrice,
      version: 1,
    }
  }

  const state: DbState = {
    schema: SCHEMA,
    seededAt: now,
    nfts,
    users: {},
    sessions: {},
    carts: {},
    favorites: {},
    wallets: {},
    walletSessions: {},
    coupons: Object.fromEntries(COUPON_SEEDS.map((coupon) => [coupon.code, { ...coupon }])),
    quotes: {},
    orders: {},
    idempotency: {},
    counters: { seq: 0, order: 1_040, event: 0 },
    recentEvents: [],
  }

  for (const user of USER_SEEDS) {
    const salt = createSalt()
    state.users[user.id] = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      bio: user.bio,
      avatarUrl: null,
      passwordSalt: salt,
      passwordHash: await hashPassword(user.password, salt),
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    for (const wallet of user.wallets) {
      state.wallets[wallet.id] = {
        ...wallet,
        userId: user.id,
        createdAt: nowIso,
        updatedAt: nowIso,
      }
    }

    state.favorites[user.id] = user.favorites.map((nftId, index) => ({
      nftId,
      addedAt: new Date(now - (index + 1) * 60_000).toISOString(),
    }))

    const cartId = `cart_${user.id}`
    state.carts[cartId] = {
      id: cartId,
      userId: user.id,
      couponCode: null,
      version: 1,
      updatedAt: nowIso,
      lines: user.cart.map((line, index) => ({
        id: `line_${user.id}_${index + 1}`,
        nftId: line.nftId,
        edition: line.edition,
        quantity: line.quantity,
        seenPrice: nfts[line.nftId]!.editions[line.edition]!.price,
        addedAt: nowIso,
      })),
    }
  }

  return state
}

/* ─── Store ───────────────────────────────────────────────────────────────── */

function readRevision() {
  try {
    return Number(localStorage.getItem(REV_KEY) ?? 0)
  } catch {
    return 0
  }
}

class MockStore {
  state!: DbState
  readonly catalog = buildCatalog()
  readonly catalogById = new Map(this.catalog.map((nft) => [nft.id, nft]))
  private revision = 0

  async init() {
    try {
      const raw = localStorage.getItem(DB_KEY)
      const persisted = raw ? (JSON.parse(raw) as DbState) : null
      if (persisted?.schema === SCHEMA) {
        this.state = persisted
        this.revision = readRevision()
        return
      }
    } catch {
      /* corrupted or unavailable storage: reseed */
    }
    await this.reset()
  }

  /** Restores the known seed (catalog, accounts, carts, coupons) and drops everything else. */
  async reset() {
    this.state = await seed(this.catalog)
    this.commit()
  }

  /** Reloads the snapshot when another tab committed a newer revision. */
  sync() {
    const revision = readRevision()
    if (revision === this.revision) return
    try {
      const raw = localStorage.getItem(DB_KEY)
      if (raw) this.state = JSON.parse(raw) as DbState
      this.revision = revision
    } catch {
      /* keep in-memory state */
    }
  }

  commit() {
    this.revision = readRevision() + 1
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this.state))
      localStorage.setItem(REV_KEY, String(this.revision))
    } catch {
      /* quota exceeded: state stays in memory for this tab */
    }
  }

  nextId(prefix: string) {
    this.state.counters.seq += 1
    const random = Math.floor(Math.random() * 36 ** 4)
      .toString(36)
      .padStart(4, '0')
    return `${prefix}_${this.state.counters.seq.toString(36)}${random}`
  }

  getNft(id: string) {
    const fixture = this.catalogById.get(id)
    const state = this.state.nfts[id]
    return fixture && state ? { fixture, state } : null
  }
}

export const store = new MockStore()

export function clearPersistedDb() {
  try {
    localStorage.removeItem(DB_KEY)
    localStorage.removeItem(REV_KEY)
  } catch {
    /* ignore */
  }
}
