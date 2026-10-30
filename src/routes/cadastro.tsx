import { createFileRoute } from '@tanstack/react-router'
import { validateAuthSearch } from '@/features/auth/search'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/cadastro')({
  validateSearch: validateAuthSearch,
  component: Page,
})

function Page() {
  usePageTitle('Criar conta')
  return (
    <section className="page-container py-12">
      <h1 className="text-2xl font-bold">Criar conta</h1>
    </section>
  )
}
