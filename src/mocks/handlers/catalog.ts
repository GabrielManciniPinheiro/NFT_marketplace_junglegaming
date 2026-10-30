import {
  categorySchema,
  networkSchema,
  nftListQuerySchema,
  type Category,
  type Network,
} from '@/api/contracts'
import { eth } from '@/lib/eth'
import { mockConfig } from '../config'
import { store } from '../db/store'
import { summaryById, toNftDetail, toNftSummary } from '../domain/catalog'
import { HERO_NFT_IDS, SPOTLIGHT_NFT_ID } from '../fixtures/catalog'
import { fail, json, route, toFieldErrors } from '../lib/http'

const DAY = 86_400_000

function parseListQuery(params: URLSearchParams) {
  const list = (key: string) => params.get(key)?.split(',').filter(Boolean)
  const number = (key: string) => (params.has(key) ? Number(params.get(key)) : undefined)
  const parsed = nftListQuerySchema.safeParse({
    q: params.get('q') ?? undefined,
    category: list('category'),
    network: list('network'),
    minPrice: params.get('minPrice') ?? undefined,
    maxPrice: params.get('maxPrice') ?? undefined,
    tab: params.get('tab') ?? undefined,
    sort: params.get('sort') ?? undefined,
    page: number('page'),
    pageSize: number('pageSize'),
  })
  if (!parsed.success) {
    throw fail(422, 'VALIDATION_FAILED', 'Parâmetros de busca inválidos.', {
      fieldErrors: toFieldErrors(parsed.error),
    })
  }
  return parsed.data
}

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const catalogHandlers = [
  route('get', '/nfts', 'none', ({ url }) => {
    const query = parseListQuery(url.searchParams)
    const all = mockConfig.get().emptyCatalog
      ? []
      : store.catalog.map((fixture) => toNftSummary(fixture, store.state.nfts[fixture.id]!))

    const term = query.q ? normalize(query.q) : ''
    const matches = {
      q: (nft: (typeof all)[number]) =>
        !term ||
        [nft.name, nft.collection.name, nft.creator.name, nft.tokenId].some((field) =>
          normalize(field).includes(term),
        ),
      category: (nft: (typeof all)[number]) =>
        !query.category?.length || query.category.includes(nft.category),
      network: (nft: (typeof all)[number]) =>
        !query.network?.length || query.network.includes(nft.network),
      price: (nft: (typeof all)[number]) =>
        (!query.minPrice || eth.cmp(nft.price, query.minPrice) >= 0) &&
        (!query.maxPrice || eth.cmp(nft.price, query.maxPrice) <= 0),
      tab: (nft: (typeof all)[number]) =>
        query.tab === 'new' ? nft.isNew : query.tab === 'trending' ? nft.trendingScore >= 70 : true,
    }
    type Filter = keyof typeof matches
    const passes = (nft: (typeof all)[number], except?: Filter) =>
      (Object.keys(matches) as Filter[]).every((key) => key === except || matches[key](nft))

    const filtered = all.filter((nft) => passes(nft))
    const byId = (a: (typeof all)[number], b: (typeof all)[number]) => a.id.localeCompare(b.id)
    filtered.sort((a, b) => {
      switch (query.sort) {
        case 'price-asc':
          return eth.cmp(a.price, b.price) || byId(a, b)
        case 'price-desc':
          return eth.cmp(b.price, a.price) || byId(a, b)
        case 'popular':
          return b.trendingScore - a.trendingScore || byId(a, b)
        case 'name-asc':
          return a.name.localeCompare(b.name, 'pt-BR') || byId(a, b)
        default:
          return b.listedAt.localeCompare(a.listedAt) || byId(a, b)
      }
    })

    // Facet counts ignore their own filter so options stay combinable.
    const facet = <T extends string>(key: 'category' | 'network', values: readonly T[]) =>
      values.map((value) => ({
        value,
        count: all.filter((nft) => passes(nft, key) && nft[key] === value).length,
      }))

    const prices = all.map((nft) => nft.price)
    const totalItems = filtered.length
    const totalPages = Math.ceil(totalItems / query.pageSize)
    const start = (query.page - 1) * query.pageSize

    return json({
      items: filtered.slice(start, start + query.pageSize),
      pageInfo: { page: query.page, pageSize: query.pageSize, totalItems, totalPages },
      facets: {
        category: facet<Category>('category', categorySchema.options),
        network: facet<Network>('network', networkSchema.options),
        priceRange: {
          min: prices.reduce((min, price) => eth.min(min, price), prices[0] ?? '0'),
          max: prices.reduce(
            (max, price) => (eth.cmp(price, max) > 0 ? price : max),
            prices[0] ?? '0',
          ),
        },
      },
    })
  }),

  route('get', '/nfts/highlights', 'none', () => {
    const spotlight = summaryById(SPOTLIGHT_NFT_ID)
    return json({
      hero: HERO_NFT_IDS.map(summaryById).filter((nft) => nft !== null),
      spotlight: spotlight
        ? {
            nft: spotlight,
            headline: 'Oferta limitada',
            endsAt: new Date(store.state.seededAt + 3 * DAY).toISOString(),
          }
        : null,
    })
  }),

  route('get', '/nfts/:id', 'none', ({ params }) => {
    const nft = store.getNft(params.id!)
    if (!nft)
      throw fail(404, 'NOT_FOUND', 'NFT não encontrado. Ele pode ter sido removido do catálogo.')
    return json(toNftDetail(nft.fixture, nft.state))
  }),

  route('get', '/nfts/:id/related', 'none', ({ params }) => {
    const nft = store.getNft(params.id!)
    if (!nft) throw fail(404, 'NOT_FOUND', 'NFT não encontrado.')
    const items = store.catalog
      .filter(
        (candidate) =>
          candidate.id !== nft.fixture.id &&
          (candidate.collection.id === nft.fixture.collection.id ||
            candidate.art === nft.fixture.art),
      )
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 5)
      .map((candidate) => toNftSummary(candidate, store.state.nfts[candidate.id]!))
    return json({ items })
  }),
]
