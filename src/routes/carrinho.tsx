import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/carrinho')({
  component: Page,
})

function Page() {
  usePageTitle('Carrinho')
  return (
    <section className="page-container py-12">
      <h1 className="text-2xl font-bold">Carrinho</h1>
    </section>
  )
}
