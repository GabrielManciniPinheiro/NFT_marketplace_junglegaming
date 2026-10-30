import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/')({
  component: Page,
})

function Page() {
  usePageTitle('Início')
  return (
    <section className="page-container py-12">
      <h1 className="text-2xl font-bold">Início</h1>
    </section>
  )
}
