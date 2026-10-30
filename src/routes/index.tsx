import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="page-container py-16">
      <p className="text-sm text-sand">Bem-vindo à Kurio</p>
      <h1 className="mt-4 text-4xl leading-snug font-bold uppercase">
        Seja dono do futuro da arte digital
      </h1>
    </main>
  )
}
