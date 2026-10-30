import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/_auth/perfil/favoritos')({
  component: Page,
})

function Page() {
  usePageTitle('Lista de interesse')
  return (
    <section className="page-container py-12">
      <h1 className="text-2xl font-bold">Lista de interesse</h1>
    </section>
  )
}
