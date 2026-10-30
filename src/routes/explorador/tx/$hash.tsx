import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/explorador/tx/$hash')({
  component: Page,
})

function Page() {
  usePageTitle('Explorador')
  return (
    <section className="page-container py-12">
      <h1 className="text-2xl font-bold">Explorador</h1>
    </section>
  )
}
