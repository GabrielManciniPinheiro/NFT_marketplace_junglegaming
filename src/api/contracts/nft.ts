import { z } from 'zod'
import {
  ethAmountSchema,
  imageSchema,
  isoDateSchema,
  networkSchema,
  pageInfoSchema,
} from './common'

export const categorySchema = z.enum([
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
])
export type Category = z.infer<typeof categorySchema>

export const CATEGORY_LABEL: Record<Category, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

/** Edition tiers shown as chips on the detail page (1/1, 1/10, 1/50, ABERTA). */
export const editionIdSchema = z.enum(['1-1', '1-10', '1-50', 'open'])
export type EditionId = z.infer<typeof editionIdSchema>

export const editionSchema = z.object({
  id: editionIdSchema,
  label: z.string(),
  /** `null` = open edition (no fixed supply). */
  supply: z.number().int().positive().nullable(),
  available: z.number().int().min(0),
  price: ethAmountSchema,
  maxPerOrder: z.number().int().positive(),
})
export type Edition = z.infer<typeof editionSchema>

const personSchema = z.object({ id: z.string(), name: z.string(), handle: z.string() })

export const nftSummarySchema = z.object({
  id: z.string(),
  tokenId: z.string(),
  name: z.string(),
  collection: z.object({ id: z.string(), name: z.string() }),
  creator: personSchema,
  category: categorySchema,
  network: networkSchema,
  image: imageSchema,
  /** Price of `defaultEdition` (what catalog cards display). */
  price: ethAmountSchema,
  /** Previous listing price, shown struck-through when the NFT is discounted. */
  previousPrice: ethAmountSchema.nullable(),
  defaultEdition: editionIdSchema,
  /** Units available across all editions. 0 = sold out. */
  available: z.number().int().min(0),
  isNew: z.boolean(),
  trendingScore: z.number(),
  listedAt: isoDateSchema,
  /** Monotonic resource version, bumped on every price/availability change. */
  version: z.number().int().min(1),
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const reviewSchema = z.object({
  id: z.string(),
  author: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: isoDateSchema,
})
export type Review = z.infer<typeof reviewSchema>

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  story: z.array(z.string()),
  gallery: z.array(imageSchema).min(1),
  editions: z.array(editionSchema).min(1),
  attributes: z.array(z.string()),
  contract: z.object({
    address: z.string(),
    standard: z.string(),
    royaltiesBps: z.number().int().min(0),
    metadataStorage: z.string(),
  }),
  rating: z.object({ average: z.number().min(0).max(5), count: z.number().int().min(0) }),
  reviews: z.array(reviewSchema),
})
export type NftDetail = z.infer<typeof nftDetailSchema>

export const nftSortSchema = z.enum(['recent', 'price-asc', 'price-desc', 'popular', 'name-asc'])
export type NftSort = z.infer<typeof nftSortSchema>

export const NFT_SORT_LABEL: Record<NftSort, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  popular: 'Mais populares',
  'name-asc': 'Nome (A–Z)',
}

export const nftTabSchema = z.enum(['all', 'new', 'trending'])
export type NftTab = z.infer<typeof nftTabSchema>

export const NFT_TAB_LABEL: Record<NftTab, string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

export const NFT_PAGE_SIZE = 12

/** Query accepted by GET /nfts (all filters combine with AND; values inside a facet with OR). */
export const nftListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.array(categorySchema).optional(),
  network: z.array(networkSchema).optional(),
  minPrice: ethAmountSchema.optional(),
  maxPrice: ethAmountSchema.optional(),
  tab: nftTabSchema.default('all'),
  sort: nftSortSchema.default('recent'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(48).default(NFT_PAGE_SIZE),
})
export type NftListQuery = z.input<typeof nftListQuerySchema>

const facetCount = <T extends z.ZodType>(value: T) =>
  z.object({ value, count: z.number().int().min(0) })

export const nftListResponseSchema = z.object({
  items: z.array(nftSummarySchema),
  pageInfo: pageInfoSchema,
  facets: z.object({
    category: z.array(facetCount(categorySchema)),
    network: z.array(facetCount(networkSchema)),
    priceRange: z.object({ min: ethAmountSchema, max: ethAmountSchema }),
  }),
})
export type NftListResponse = z.infer<typeof nftListResponseSchema>

export const highlightsResponseSchema = z.object({
  hero: z.array(nftSummarySchema),
  spotlight: z
    .object({
      nft: nftSummarySchema,
      headline: z.string(),
      endsAt: isoDateSchema,
    })
    .nullable(),
})
export type HighlightsResponse = z.infer<typeof highlightsResponseSchema>

export const relatedResponseSchema = z.object({ items: z.array(nftSummarySchema) })
