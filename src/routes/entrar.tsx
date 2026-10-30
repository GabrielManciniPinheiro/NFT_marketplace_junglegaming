import { createFileRoute } from '@tanstack/react-router'
import { validateAuthSearch } from '@/features/auth/search'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/entrar')({
  validateSearch: validateAuthSearch,
  component: Page,
})

function Page() {
  usePageTitle('Entrar')
  return (
    <section className="page-container py-12">
      <h1 className="text-2xl font-bold">Entrar</h1>
    </section>
  )
}
