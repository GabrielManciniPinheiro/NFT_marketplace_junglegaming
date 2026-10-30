import { createFileRoute } from '@tanstack/react-router'
import { validateCatalogSearch } from '@/features/catalog/search'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/mercado')({
  validateSearch: validateCatalogSearch,
  component: Page,
})

function Page() {
  usePageTitle('Mercado')
  return (
    <section className="page-container py-12">
      <h1 className="text-2xl font-bold">Mercado</h1>
    </section>
  )
}
