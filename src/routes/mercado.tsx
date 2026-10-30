import { createFileRoute } from '@tanstack/react-router'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { Catalog } from '@/features/catalog/components/Catalog'
import { highlightsQueryOptions, nftListQueryOptions } from '@/features/catalog/queries'
import { toListQuery, validateCatalogSearch } from '@/features/catalog/search'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/mercado')({
  validateSearch: validateCatalogSearch,
  loaderDeps: ({ search }) => toListQuery(search),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(highlightsQueryOptions())
    void context.queryClient.prefetchQuery(nftListQueryOptions(deps))
  },
  component: MarketPage,
})

function MarketPage() {
  const { q } = Route.useSearch()
  usePageTitle(q ? `Resultados para “${q}”` : 'Mercado')
  return (
    <>
      <div className="page-container pt-8">
        <Breadcrumbs items={[{ label: 'Início', link: { to: '/' } }, { label: 'Mercado' }]} />
        <h1 className="mt-4 text-2xl font-bold">{q ? `Resultados para “${q}”` : 'Mercado'}</h1>
      </div>
      <Catalog />
    </>
  )
}
