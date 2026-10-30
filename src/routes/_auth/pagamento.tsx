import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/_auth/pagamento')({
  component: Page,
})

function Page() {
  usePageTitle('Pagamento')
  return (
    <section className="page-container py-12">
      <h1 className="text-2xl font-bold">Pagamento</h1>
    </section>
  )
}
