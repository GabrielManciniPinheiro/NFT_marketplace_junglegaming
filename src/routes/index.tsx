import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
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

const Catalog = lazy(() =>
  import('@/features/catalog/components/Catalog').then((module) => ({ default: module.Catalog })),
)

/** Upper bound for holding the catalog back when the hero artwork is slow to arrive. */
const HERO_WAIT_MS = 3_000

function HomePage() {
  usePageTitle(null)
  // On phones the catalog sits below the fold: its code (and its card images) load once the
  // hero artwork — the LCP element — is on screen, so they never compete for bandwidth.
  // Its data is already being fetched by the loader in the meantime.
  const [heroSettled, setHeroSettled] = useState(false)
  const settle = useCallback(() => setHeroSettled(true), [])
  useEffect(() => {
    const timer = setTimeout(settle, HERO_WAIT_MS)
    return () => clearTimeout(timer)
  }, [settle])

  const placeholder = <div id="catalogo" className="min-h-[75rem]" />
  return (
    <>
      <Hero onSettled={settle} />
      {heroSettled ? (
        <Suspense fallback={placeholder}>
          <Catalog />
        </Suspense>
      ) : (
        placeholder
      )}
    </>
  )
}
