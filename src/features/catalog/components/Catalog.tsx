import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { SearchXIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cn } from 'cn'
import { NFT_SORT_LABEL, NFT_TAB_LABEL, type NftSort, type NftTab } from '@/api/contracts'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { nftListQueryOptions } from '../queries'
import {
  activeFilterCount,
  toListQuery,
  validateCatalogSearch,
  type CatalogSearch,
} from '../search'
import { ActiveFilters } from './ActiveFilters'
import { CatalogFilters } from './CatalogFilters'
import { CatalogPagination } from './CatalogPagination'
import { NftCard, NftCardSkeleton } from './NftCard'
import { SpotlightCard } from './SpotlightCard'

const SKELETON_CARDS = 6

/**
 * Catalog bound to the current route's search params (Início and Mercado share it).
 * Every interaction writes to the URL, so state survives refresh and history navigation.
 */
export function Catalog({ priorityImages = 0 }: { priorityImages?: number }) {
  const raw = useSearch({ strict: false })
  const search = useMemo(() => validateCatalogSearch(raw as Record<string, unknown>), [raw])
  const navigate = useNavigate()
  const query = toListQuery(search)
  const list = useQuery(nftListQueryOptions(query))
  const [filtersOpen, setFiltersOpen] = useState(false)

  const update = (patch: Partial<CatalogSearch>) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({
        ...validateCatalogSearch(previous),
        ...patch,
        page: undefined,
      }),
      resetScroll: false,
    })

  // A page beyond the last one (e.g. after filters shrank the result) snaps back.
  const totalPages = list.data?.pageInfo.totalPages ?? 0
  const page = query.page ?? 1
  const showingPlaceholder = list.isPlaceholderData
  useEffect(() => {
    if (showingPlaceholder || totalPages === 0 || page <= totalPages) return
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({
        ...validateCatalogSearch(previous),
        page: totalPages === 1 ? undefined : totalPages,
      }),
      resetScroll: false,
      replace: true,
    })
  }, [showingPlaceholder, totalPages, page, navigate])

  const tab: NftTab = search.tab ?? 'all'
  const sort: NftSort = search.sort ?? 'recent'
  const filterCount = activeFilterCount(search)
  const items = list.data?.items ?? []
  const updating = list.isFetching && !list.isPending

  const filters = (
    <CatalogFilters
      search={search}
      facets={list.data?.facets}
      loading={list.isPending}
      onChange={(patch) => update(patch)}
    />
  )

  return (
    <section
      id="catalogo"
      aria-labelledby="catalog-heading"
      className="page-container grid scroll-mt-6 gap-8 py-10 defer-render md:grid-cols-[16.5rem_minmax(0,1fr)] lg:grid-cols-[19.5rem_minmax(0,1fr)]"
    >
      <h2 id="catalog-heading" className="sr-only">
        Catálogo de NFTs
      </h2>

      <aside aria-label="Filtros do catálogo" className="hidden flex-col gap-6 md:flex">
        <div className="rounded-md bg-surface px-4 py-5">{filters}</div>
        <SpotlightCard />
      </aside>

      <Tabs
        value={tab}
        activationMode="manual"
        onValueChange={(value) => update({ tab: value === 'all' ? undefined : (value as NftTab) })}
        className="min-w-0 gap-0"
      >
        <div className="flex flex-col gap-x-6 gap-y-3 border-b border-border sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <TabsList
            variant="line"
            aria-label="Seções do catálogo"
            className="h-auto w-full flex-wrap justify-start gap-x-5 gap-y-1 p-0 sm:w-auto"
          >
            {(Object.keys(NFT_TAB_LABEL) as NftTab[]).map((value) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-auto flex-none px-0 pt-1 pb-3 text-sm text-soft after:bg-brand group-data-horizontal/tabs:after:-bottom-px group-data-[variant=line]/tabs-list:data-active:text-brand"
              >
                {NFT_TAB_LABEL[value]}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex items-center justify-between gap-3 pb-2 sm:justify-end">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden">
                  <SlidersHorizontalIcon aria-hidden />
                  Filtros{filterCount > 0 && ` (${filterCount})`}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(22rem,90vw)] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>
                    Os resultados são atualizados a cada alteração.
                  </SheetDescription>
                </SheetHeader>
                <div className="px-4">{filters}</div>
                <SheetFooter>
                  <Button onClick={() => setFiltersOpen(false)}>
                    Ver {list.data?.pageInfo.totalItems ?? ''} resultados
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            <div className="flex min-w-0 items-center gap-1">
              <Label
                htmlFor="catalog-sort"
                className="text-sm font-normal whitespace-nowrap text-soft max-sm:sr-only"
              >
                Ordenar por:
              </Label>
              <Select
                value={sort}
                onValueChange={(value) =>
                  update({ sort: value === 'recent' ? undefined : (value as NftSort) })
                }
              >
                <SelectTrigger
                  id="catalog-sort"
                  size="sm"
                  className="h-8 max-w-[14rem] min-w-0 border-none bg-transparent px-1.5 text-sm text-soft shadow-none dark:bg-transparent"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {(Object.keys(NFT_SORT_LABEL) as NftSort[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {NFT_SORT_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <TabsContent value={tab} className="mt-0">
          <ActiveFilters search={search} onChange={(patch) => update(patch)} />

          <div
            className="mt-4 flex min-h-5 items-center gap-2 text-xs text-meta"
            role="status"
            aria-live="polite"
          >
            {list.data && !list.isPlaceholderData && (
              <span>
                {list.data.pageInfo.totalItems === 1
                  ? '1 NFT encontrado'
                  : `${list.data.pageInfo.totalItems} NFTs encontrados`}
              </span>
            )}
            {updating && (
              <span className="inline-flex items-center gap-1.5">
                <Spinner className="size-3" aria-hidden />
                Atualizando resultados…
              </span>
            )}
          </div>

          {list.isPending ? (
            <ul
              className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 lg:grid-cols-3"
              aria-label="Carregando NFTs"
            >
              {Array.from({ length: SKELETON_CARDS }, (_, index) => (
                <li key={index}>
                  <NftCardSkeleton />
                </li>
              ))}
            </ul>
          ) : list.isError && !list.data ? (
            <ErrorState
              className="mt-4"
              title="Não foi possível carregar o catálogo"
              error={list.error}
              onRetry={() => void list.refetch()}
              retrying={list.isFetching}
            />
          ) : items.length === 0 ? (
            <Empty className="mt-4 border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchXIcon aria-hidden />
                </EmptyMedia>
                <EmptyTitle>
                  {filterCount ? 'Nenhum NFT encontrado' : 'Nenhum NFT disponível no momento'}
                </EmptyTitle>
                <EmptyDescription>
                  {filterCount
                    ? 'Tente remover alguns filtros ou buscar por outro termo.'
                    : 'Novos lançamentos aparecem aqui assim que forem listados.'}
                </EmptyDescription>
              </EmptyHeader>
              {filterCount > 0 && (
                <EmptyContent>
                  <Button
                    variant="outline"
                    onClick={() =>
                      update({
                        q: undefined,
                        category: undefined,
                        network: undefined,
                        min: undefined,
                        max: undefined,
                      })
                    }
                  >
                    Limpar filtros
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <>
              {list.isError && (
                <p role="alert" className="mt-4 text-xs text-destructive">
                  Não foi possível atualizar os resultados. Exibindo a última versão carregada.{' '}
                  <button type="button" className="underline" onClick={() => void list.refetch()}>
                    Tentar novamente
                  </button>
                </p>
              )}
              <ul
                aria-busy={updating}
                className={cn(
                  'mt-4 grid grid-cols-2 gap-x-4 gap-y-7 transition-opacity sm:gap-x-6 lg:grid-cols-3',
                  list.isPlaceholderData && 'opacity-60',
                )}
              >
                {items.map((nft, index) => (
                  <li key={nft.id}>
                    <NftCard nft={nft} priority={index < priorityImages} />
                  </li>
                ))}
              </ul>
              <CatalogPagination page={page} totalPages={totalPages} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}
