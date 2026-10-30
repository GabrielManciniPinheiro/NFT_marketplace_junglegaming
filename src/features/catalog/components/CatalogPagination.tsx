import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from 'cn'
import { buttonVariants } from '@/components/ui/button'
import type { CatalogSearch } from '../search'

function pageWindow(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)
  return sorted.flatMap((page, index) =>
    index > 0 && page - sorted[index - 1]! > 1 ? ['gap' as const, page] : [page],
  )
}

function scrollToCatalog() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document
    .getElementById('catalogo')
    ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

export function CatalogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null
  const linkTo = (target: number) => (previous: CatalogSearch) => ({
    ...previous,
    page: target === 1 ? undefined : target,
  })
  const itemClass = (active: boolean) =>
    cn(
      buttonVariants({ variant: active ? 'default' : 'ghost', size: 'icon-sm' }),
      'tabular-nums',
      !active && 'text-sand',
    )

  return (
    <nav aria-label="Paginação do catálogo" className="mt-10 flex flex-col items-center gap-3">
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          {page > 1 ? (
            <Link
              to="."
              search={linkTo(page - 1)}
              resetScroll={false}
              onClick={scrollToCatalog}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-sand')}
            >
              <ChevronLeftIcon aria-hidden />
              Anterior
            </Link>
          ) : (
            <span
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'opacity-40')}
              aria-disabled
            >
              <ChevronLeftIcon aria-hidden />
              Anterior
            </span>
          )}
        </li>
        {pageWindow(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden className="px-1 text-meta">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                to="."
                search={linkTo(item)}
                resetScroll={false}
                onClick={scrollToCatalog}
                aria-label={`Página ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className={itemClass(item === page)}
              >
                {item}
              </Link>
            </li>
          ),
        )}
        <li>
          {page < totalPages ? (
            <Link
              to="."
              search={linkTo(page + 1)}
              resetScroll={false}
              onClick={scrollToCatalog}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-sand')}
            >
              Próxima
              <ChevronRightIcon aria-hidden />
            </Link>
          ) : (
            <span
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'opacity-40')}
              aria-disabled
            >
              Próxima
              <ChevronRightIcon aria-hidden />
            </span>
          )}
        </li>
      </ul>
      <p className="text-xs text-meta">
        Página {page} de {totalPages}
      </p>
    </nav>
  )
}
