import { Link } from '@tanstack/react-router'
import { CompassIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NotFoundProps {
  title?: string
  description?: string
}

export function NotFound({
  title = 'Página não encontrada',
  description = 'O endereço acessado não existe ou foi movido.',
}: NotFoundProps) {
  return (
    <section className="page-container flex flex-col items-center gap-5 py-24 text-center">
      <CompassIcon className="size-10 text-brand" aria-hidden />
      <div className="space-y-2">
        <p className="text-sm font-bold tracking-widest text-meta">ERRO 404</p>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="max-w-md text-sm text-sand">{description}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/mercado">Explorar o mercado</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">Ir para o início</Link>
        </Button>
      </div>
    </section>
  )
}
