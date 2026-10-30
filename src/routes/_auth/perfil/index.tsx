import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/_auth/perfil/')({
  component: Page,
})

function Page() {
  usePageTitle('Dados do perfil')
  return (
    <section className="page-container py-12">
      <h1 className="text-2xl font-bold">Dados do perfil</h1>
    </section>
  )
}
