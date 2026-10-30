import { XIcon } from 'lucide-react'
import { CATEGORY_LABEL, NETWORK_LABEL } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import type { CatalogSearch } from '../search'

interface Chip {
  key: string
  label: string
  remove: Partial<CatalogSearch>
}

/** Removable chips for every active filter, plus "clear all". */
export function ActiveFilters({
  search,
  onChange,
}: {
  search: CatalogSearch
  onChange: (patch: Partial<CatalogSearch>) => void
}) {
  const chips: Chip[] = []
  if (search.q) chips.push({ key: 'q', label: `Busca: “${search.q}”`, remove: { q: undefined } })
  for (const category of search.category ?? []) {
    const rest = search.category!.filter((item) => item !== category)
    chips.push({
      key: `c-${category}`,
      label: CATEGORY_LABEL[category],
      remove: { category: rest.length ? rest : undefined },
    })
  }
  for (const network of search.network ?? []) {
    const rest = search.network!.filter((item) => item !== network)
    chips.push({
      key: `n-${network}`,
      label: NETWORK_LABEL[network],
      remove: { network: rest.length ? rest : undefined },
    })
  }
  if (search.min !== undefined || search.max !== undefined) {
    const from = search.min !== undefined ? `${search.min}` : 'mín.'
    const to = search.max !== undefined ? `${search.max}` : 'máx.'
    chips.push({
      key: 'price',
      label: `Preço: ${from} – ${to} ETH`,
      remove: { min: undefined, max: undefined },
    })
  }
  if (!chips.length) return null

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-xs text-meta">Filtros ativos:</span>
      <ul className="contents">
        {chips.map((chip) => (
          <li key={chip.key}>
            <button
              type="button"
              onClick={() => onChange(chip.remove)}
              className="inline-flex items-center gap-1 rounded-full border border-primary/50 px-2.5 py-1 text-xs text-soft transition-colors hover:border-primary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {chip.label}
              <XIcon className="size-3" aria-hidden />
              <span className="sr-only">(remover filtro)</span>
            </button>
          </li>
        ))}
      </ul>
      <Button
        variant="link"
        size="sm"
        className="text-xs"
        onClick={() =>
          onChange({
            q: undefined,
            category: undefined,
            network: undefined,
            min: undefined,
            max: undefined,
          })
        }
      >
        Limpar tudo
      </Button>
    </div>
  )
}
