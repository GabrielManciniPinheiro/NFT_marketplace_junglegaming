import { Link } from '@tanstack/react-router'
import { HourglassIcon } from 'lucide-react'
import { usePageTitle } from '@/lib/use-page-title'

/** Out-of-scope sections: explicit "not available" state instead of a fake success. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  usePageTitle(title)
  return (
    <section className="page-container flex flex-col items-center gap-4 py-24 text-center">
      <HourglassIcon className="size-9 text-brand" aria-hidden />
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="max-w-md text-sm text-sand">{description}</p>
      <p className="rounded-sm border border-border px-3 py-1 text-xs text-meta">
        Indisponível nesta versão de demonstração
      </p>
      <Link to="/mercado" className="text-sm text-brand underline-offset-4 hover:underline">
        Voltar ao mercado
      </Link>
    </section>
  )
}
