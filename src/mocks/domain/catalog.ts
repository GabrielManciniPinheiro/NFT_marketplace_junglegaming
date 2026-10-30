import type { z } from 'zod'
import type {
  EditionId,
  editionSchema,
  nftDetailSchema,
  NftUpdatedEvent,
  nftSummarySchema,
  RealtimeEvent,
} from '@/api/contracts'
import { eth } from '@/lib/eth'
import { galleryImages, mainImage, type NftFixture } from '../fixtures/catalog'
import { store, type NftState } from '../db/store'
import { broadcast } from '../realtime/server'

type EditionDto = z.input<typeof editionSchema>
type NftSummaryDto = z.input<typeof nftSummarySchema>
type NftDetailDto = z.input<typeof nftDetailSchema>

export function editionsOf(fixture: NftFixture, state: NftState): EditionDto[] {
  return fixture.editions.map((edition) => ({
    ...edition,
    price: state.editions[edition.id]?.price ?? edition.price,
    available: state.editions[edition.id]?.available ?? edition.available,
  }))
}

export function toNftSummary(fixture: NftFixture, state: NftState): NftSummaryDto {
  const editions = editionsOf(fixture, state)
  const featured = editions.find((edition) => edition.id === fixture.defaultEdition) ?? editions[0]!
  return {
    id: fixture.id,
    tokenId: fixture.tokenId,
    name: fixture.name,
    collection: fixture.collection,
    creator: fixture.creator,
    category: fixture.category,
    network: fixture.network,
    image: mainImage(fixture.art, fixture.name),
    price: featured.price,
    previousPrice: state.previousPrice,
    defaultEdition: fixture.defaultEdition,
    available: editions.reduce((sum, edition) => sum + edition.available, 0),
    isNew: fixture.isNew,
    trendingScore: fixture.trendingScore,
    listedAt: fixture.listedAt,
    version: state.version,
  }
}

export function toNftDetail(fixture: NftFixture, state: NftState): NftDetailDto {
  const ratingSum = fixture.reviews.reduce((sum, review) => sum + review.rating, 0)
  return {
    ...toNftSummary(fixture, state),
    description: fixture.description,
    story: fixture.story,
    gallery: galleryImages(fixture.art, fixture.name),
    editions: editionsOf(fixture, state),
    attributes: fixture.attributes,
    contract: fixture.contract,
    rating: {
      average: fixture.reviews.length
        ? Math.round((ratingSum / fixture.reviews.length) * 10) / 10
        : 0,
      count: fixture.reviews.length,
    },
    reviews: fixture.reviews,
  }
}

export function summaryById(nftId: string) {
  const nft = store.getNft(nftId)
  return nft ? toNftSummary(nft.fixture, nft.state) : null
}

/* ─── Realtime events ─────────────────────────────────────────────────────── */

const RECENT_EVENTS = 25

export function nextEventId() {
  store.state.counters.event += 1
  return `evt_${store.state.counters.event}`
}

export function rememberEvent(event: RealtimeEvent) {
  store.state.recentEvents = [...store.state.recentEvents, event].slice(-RECENT_EVENTS)
}

export function buildNftUpdatedEvent(nftId: string): NftUpdatedEvent {
  const nft = store.getNft(nftId)
  if (!nft) throw new Error(`NFT inexistente: ${nftId}`)
  const summary = toNftSummary(nft.fixture, nft.state)
  return {
    id: nextEventId(),
    type: 'nft.updated',
    resource: { type: 'nft', id: nftId },
    version: nft.state.version,
    occurredAt: new Date().toISOString(),
    data: {
      price: summary.price,
      previousPrice: summary.previousPrice,
      available: summary.available,
      editions: editionsOf(nft.fixture, nft.state).map(({ id, price, available }) => ({
        id,
        price,
        available,
      })),
    },
  } as NftUpdatedEvent
}

/** Bumps the version of every cart holding `nftId` (their totals changed). */
function touchCarts(nftId: string) {
  const now = new Date().toISOString()
  for (const cart of Object.values(store.state.carts)) {
    if (cart.lines.some((line) => line.nftId === nftId)) {
      cart.version += 1
      cart.updatedAt = now
    }
  }
}

export interface NftPatch {
  edition?: EditionId
  price?: string
  available?: number
  /** Relative change applied to `available` (reservations, releases). */
  availableDelta?: number
}

/**
 * Single entry point for catalog mutations: updates REST state and publishes the matching
 * `nft.updated` event, so both channels always agree.
 */
export function updateNft(nftId: string, patches: NftPatch | NftPatch[]) {
  const nft = store.getNft(nftId)
  if (!nft) throw new Error(`NFT inexistente: ${nftId}`)

  for (const patch of Array.isArray(patches) ? patches : [patches]) {
    const editionId = patch.edition ?? nft.fixture.defaultEdition
    const edition = nft.state.editions[editionId]
    if (!edition) throw new Error(`Edição ${editionId} inexistente em ${nftId}`)
    if (patch.price !== undefined) edition.price = eth.normalize(patch.price)
    if (patch.available !== undefined) edition.available = Math.max(0, Math.floor(patch.available))
    if (patch.availableDelta)
      edition.available = Math.max(0, edition.available + patch.availableDelta)
  }

  nft.state.version += 1
  touchCarts(nftId)
  const event = buildNftUpdatedEvent(nftId)
  rememberEvent(event)
  store.commit()
  broadcast(event)
  return event
}
