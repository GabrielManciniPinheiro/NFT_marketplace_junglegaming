import { createFileRoute, useRouter } from '@tanstack/react-router'
import { BlocksIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/explorador/tx/$hash')({
  component: ExplorerPage,
})

/** Transaction references are simulated: this page says so instead of linking to a real chain. */
function ExplorerPage() {
  usePageTitle('Explorador (simulado)')
  const { hash } = Route.useParams()
  const router = useRouter()
  const valid = /^0x[a-f0-9]{64}$/i.test(hash)

  return (
    <section className="page-container flex flex-col items-center gap-5 py-20 text-center">
      <BlocksIcon className="size-10 text-brand" aria-hidden />
      <h1 className="text-2xl font-bold">Explorador de transações (simulado)</h1>
      {valid ? (
        <dl className="w-full max-w-xl space-y-3 rounded-lg bg-surface p-5 text-left text-sm">
          <div>
            <dt className="text-xs text-meta">Hash</dt>
            <dd className="font-mono break-all">{hash}</dd>
          </div>
          <div>
            <dt className="text-xs text-meta">Status</dt>
            <dd>Confirmada no ambiente de demonstração</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-destructive">
          O identificador informado não é um hash de transação válido.
        </p>
      )}
      <p className="max-w-xl text-sm text-sand">
        Esta transação existe apenas na simulação da Kurio. Nenhuma blockchain real foi consultada e
        nenhum ativo foi transferido.
      </p>
      <Button variant="outline" onClick={() => router.history.back()}>
        Voltar
      </Button>
    </section>
  )
}
