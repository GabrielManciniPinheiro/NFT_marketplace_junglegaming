import { z } from 'zod'
import {
  categorySchema,
  networkSchema,
  nftSortSchema,
  nftTabSchema,
  type NftListQuery,
} from '@/api/contracts'
import { NFT_PAGE_SIZE } from '@/api/contracts'

/** Comma separated list in the URL (`category=musica,arte-3d`); unknown values are dropped. */
function listOf<T extends z.ZodType<string>>(item: T) {
  return z
    .preprocess((value) => {
      const raw = typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : []
      const valid = raw.filter((entry) => item.safeParse(entry).success)
      return valid.length ? [...new Set(valid)] : undefined
    }, z.array(item).optional())
    .catch(undefined)
}

const optionalNumber = z.coerce.number().nonnegative().optional().catch(undefined)

/**
 * Catalog state that lives in the URL (search, filters, sort, tab, page), so it survives
 * refreshes, deep links and back/forward navigation. Defaults are omitted from the URL.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  category: listOf(categorySchema),
  network: listOf(networkSchema),
  min: optionalNumber,
  max: optionalNumber,
  tab: nftTabSchema.optional().catch(undefined),
  sort: nftSortSchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export function validateCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  const parsed = catalogSearchSchema.parse(search)
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined && value !== ''),
  ) as CatalogSearch
}

/** Maps URL state to the API query (ETH bounds travel as decimal strings). */
export function toListQuery(search: CatalogSearch): NftListQuery {
  const toEth = (value: number | undefined) =>
    value === undefined
      ? undefined
      : (Number(value.toFixed(6)).toString() as NftListQuery['minPrice'])
  return {
    q: search.q || undefined,
    category: search.category,
    network: search.network,
    minPrice: toEth(search.min),
    maxPrice: toEth(search.max),
    tab: search.tab ?? 'all',
    sort: search.sort ?? 'recent',
    page: search.page ?? 1,
    pageSize: NFT_PAGE_SIZE,
  }
}

/** Any filter change goes back to the first page. */
export function withFilters(patch: Partial<CatalogSearch>) {
  return (previous: CatalogSearch): CatalogSearch => ({ ...previous, ...patch, page: undefined })
}
