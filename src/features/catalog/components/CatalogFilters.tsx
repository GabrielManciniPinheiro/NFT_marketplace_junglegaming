import { CheckIcon } from 'lucide-react'
import { useState } from 'react'
import { cn } from 'cn'
import {
  CATEGORY_LABEL,
  NETWORK_LABEL,
  type Category,
  type Network,
  type NftListResponse,
} from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import type { CatalogSearch } from '../search'

interface FacetOption<T extends string> {
  value: T
  label: string
  /** null = loading, undefined = unknown (request failed). */
  count: number | null | undefined
}

function FacetGroup<T extends string>({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string
  options: FacetOption<T>[]
  selected: T[] | undefined
  onToggle: (value: T) => void
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-[0.9375rem] font-bold">{title}</legend>
      <ul className="flex flex-col gap-0.5">
        {options.map((option) => {
          const checked = selected?.includes(option.value) ?? false
          return (
            <li key={option.value}>
              <label
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 rounded-sm px-1.5 py-1.5 text-sm transition-colors',
                  'has-focus-visible:ring-2 has-focus-visible:ring-ring',
                  checked ? 'text-brand' : 'text-sand hover:text-foreground',
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => onToggle(option.value)}
                />
                <span className="flex min-w-0 items-center gap-1.5">
                  <CheckIcon
                    className={cn('size-3.5 shrink-0', !checked && 'hidden')}
                    aria-hidden
                  />
                  <span className="truncate">{option.label}</span>
                </span>
                {option.count === null ? (
                  <Skeleton className="h-4 w-7" />
                ) : option.count === undefined ? null : (
                  <span className={cn('tabular-nums', checked ? 'text-brand' : 'text-soft')}>
                    <span aria-hidden>({option.count})</span>
                    <span className="sr-only">, {option.count} NFTs</span>
                  </span>
                )}
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

/* ─── Price range (log scale: prices span 0.02 → 12.30 ETH) ──────────────── */

const STEPS = 1_000
const toPosition = (price: number, lo: number, hi: number) =>
  Math.round((Math.log(price / lo) / Math.log(hi / lo)) * STEPS)
const toPrice = (position: number, lo: number, hi: number) => {
  const value = lo * Math.pow(hi / lo, position / STEPS)
  return Number(value.toFixed(value < 0.1 ? 3 : 2))
}
const formatPrice = (value: number) => value.toFixed(value < 0.01 ? 3 : 2)

function PriceRangeFilter({
  bounds,
  min,
  max,
  onApply,
}: {
  bounds: { min: number; max: number }
  min: number | undefined
  max: number | undefined
  onApply: (min: number | undefined, max: number | undefined) => void
}) {
  const lo = Math.max(0.001, Math.floor(bounds.min * 100) / 100)
  const hi = Math.max(lo * 2, Math.ceil(bounds.max * 100) / 100)
  const [positions, setPositions] = useState<[number, number]>([
    toPosition(Math.min(Math.max(min ?? lo, lo), hi), lo, hi),
    toPosition(Math.min(Math.max(max ?? hi, lo), hi), lo, hi),
  ])
  const draft = [toPrice(positions[0], lo, hi), toPrice(positions[1], lo, hi)] as const

  return (
    <fieldset className="min-w-0">
      <legend className="mb-4 text-[0.9375rem] font-bold">Faixa de preço</legend>
      <Slider
        min={0}
        max={STEPS}
        step={1}
        minStepsBetweenThumbs={10}
        value={positions}
        onValueChange={(value) => setPositions([value[0] ?? 0, value[1] ?? STEPS])}
        thumbLabels={['Preço mínimo', 'Preço máximo']}
        thumbValueTexts={[`${formatPrice(draft[0])} ETH`, `${formatPrice(draft[1])} ETH`]}
        className="px-1"
      />
      <p className="mt-3 text-xs text-sand" aria-hidden>
        Preço: {formatPrice(draft[0])} – {formatPrice(draft[1])} ETH
      </p>
      <Button
        size="sm"
        className="mt-3 h-7 px-3 text-xs"
        onClick={() =>
          onApply(
            positions[0] <= 0 ? undefined : draft[0],
            positions[1] >= STEPS ? undefined : draft[1],
          )
        }
      >
        Aplicar
      </Button>
    </fieldset>
  )
}

/* ─── Panel ───────────────────────────────────────────────────────────────── */

interface CatalogFiltersProps {
  search: CatalogSearch
  facets: NftListResponse['facets'] | undefined
  /** Skeletons only while the first response is on its way. */
  loading: boolean
  onChange: (patch: Partial<CatalogSearch>) => void
}

const toggle = <T extends string>(list: T[] | undefined, value: T) => {
  const next = list?.includes(value)
    ? list.filter((item) => item !== value)
    : [...(list ?? []), value]
  return next.length ? next : undefined
}

export function CatalogFilters({ search, facets, loading, onChange }: CatalogFiltersProps) {
  const categories: FacetOption<Category>[] = (Object.keys(CATEGORY_LABEL) as Category[]).map(
    (value) => ({
      value,
      label: CATEGORY_LABEL[value],
      count:
        facets?.category.find((facet) => facet.value === value)?.count ??
        (loading ? null : undefined),
    }),
  )
  const networks: FacetOption<Network>[] = (Object.keys(NETWORK_LABEL) as Network[]).map(
    (value) => ({
      value,
      label: NETWORK_LABEL[value],
      count:
        facets?.network.find((facet) => facet.value === value)?.count ??
        (loading ? null : undefined),
    }),
  )
  const bounds = facets
    ? { min: Number(facets.priceRange.min), max: Number(facets.priceRange.max) }
    : null

  return (
    <div className="flex flex-col gap-7">
      <FacetGroup
        title="Coleções"
        options={categories}
        selected={search.category}
        onToggle={(value) => onChange({ category: toggle(search.category, value) })}
      />
      {bounds && bounds.max > 0 ? (
        <PriceRangeFilter
          key={`${search.min}-${search.max}-${bounds.min}-${bounds.max}`}
          bounds={bounds}
          min={search.min}
          max={search.max}
          onApply={(min, max) => onChange({ min, max })}
        />
      ) : loading ? (
        <div className="space-y-3" aria-hidden>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-7 w-20" />
        </div>
      ) : null}
      <FacetGroup
        title="Rede"
        options={networks}
        selected={search.network}
        onToggle={(value) => onChange({ network: toggle(search.network, value) })}
      />
    </div>
  )
}
