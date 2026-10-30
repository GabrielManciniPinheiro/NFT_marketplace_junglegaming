import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/_auth/perfil/carteiras')({
  component: Page,
})

function Page() {
  usePageTitle('Carteiras')
  return (
    <section className="page-container py-12">
      <h1 className="text-2xl font-bold">Carteiras</h1>
    </section>
  )
}
