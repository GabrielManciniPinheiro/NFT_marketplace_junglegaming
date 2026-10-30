import { createFileRoute } from '@tanstack/react-router'
import { Catalog } from '@/features/catalog/components/Catalog'
import { Hero } from '@/features/catalog/components/Hero'
import { highlightsQueryOptions, nftListQueryOptions } from '@/features/catalog/queries'
import { toListQuery, validateCatalogSearch } from '@/features/catalog/search'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/')({
  validateSearch: validateCatalogSearch,
  loaderDeps: ({ search }) => toListQuery(search),
  // Prime the cache in parallel with the route code; components read through useQuery.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(highlightsQueryOptions())
    void context.queryClient.prefetchQuery(nftListQueryOptions(deps))
  },
  component: HomePage,
})

function HomePage() {
  usePageTitle(null)
  return (
    <>
      <Hero />
      <Catalog />
    </>
  )
}
