import { MinusIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { cn } from 'cn'

interface QuantityStepperProps {
  value: number
  max: number
  min?: number
  onChange: (value: number) => void
  /** Accessible name of the group/input, e.g. "Quantidade de Emerald Ape #042". */
  label?: string
  size?: 'lg' | 'sm'
  disabled?: boolean
  describedBy?: string
}

/**
 * − value + control. Buttons respect min/max (integers only); typed values are clamped on
 * blur/Enter so the quantity can never exceed the edition limit.
 */
export function QuantityStepper({
  value,
  max,
  min = 1,
  onChange,
  label = 'Quantidade',
  size = 'lg',
  disabled = false,
  describedBy,
}: QuantityStepperProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const clamp = (next: number) =>
    Math.min(Math.max(Math.trunc(next) || min, min), Math.max(max, min))

  const commit = () => {
    if (draft === null) return
    const next = clamp(Number(draft))
    setDraft(null)
    if (next !== value) onChange(next)
  }

  const button = cn(
    'grid place-items-center bg-primary text-primary-foreground transition-colors hover:bg-brand',
    'focus-visible:ring-3 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-40',
    size === 'lg' ? 'h-10 w-7 rounded-full' : 'size-5 rounded-sm',
  )

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex items-center', size === 'lg' ? 'gap-2' : 'gap-1.5')}
    >
      <button
        type="button"
        className={button}
        aria-label="Diminuir quantidade"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        <MinusIcon className={size === 'lg' ? 'size-4' : 'size-3'} strokeWidth={3} aria-hidden />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        aria-label={label}
        aria-describedby={describedBy}
        disabled={disabled}
        value={draft ?? String(value)}
        onFocus={() => setDraft(String(value))}
        onChange={(event) => setDraft(event.target.value.replace(/[^\d]/g, ''))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          }
        }}
        className={cn(
          'rounded-sm bg-transparent text-center font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring',
          size === 'lg' ? 'h-10 w-9 text-base' : 'h-6 w-7 text-sm',
        )}
      />
      <button
        type="button"
        className={button}
        aria-label="Aumentar quantidade"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        <PlusIcon className={size === 'lg' ? 'size-4' : 'size-3'} strokeWidth={3} aria-hidden />
      </button>
    </div>
  )
}
