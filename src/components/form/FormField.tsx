import { CircleAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from 'cn'
import { Label } from '@/components/ui/label'

export interface ControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby'?: string
  required?: boolean
}

interface FormFieldProps {
  id: string
  label: ReactNode
  required?: boolean
  description?: ReactNode
  error?: string
  hideLabel?: boolean
  className?: string
  labelClassName?: string
  children: (control: ControlProps) => ReactNode
}

/**
 * Label + control + help + error, wired with htmlFor / aria-describedby / aria-invalid.
 * The required asterisk is decorative (the input carries `required`); errors carry an
 * icon so they do not rely on color alone.
 */
export function FormField({
  id,
  label,
  required = false,
  description,
  error,
  hideLabel = false,
  className,
  labelClassName,
  children,
}: FormFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, descriptionId].filter(Boolean).join(' ') || undefined

  return (
    <div
      className={cn('flex min-w-0 flex-col gap-1.5', className)}
      data-invalid={error ? true : undefined}
    >
      <Label
        htmlFor={id}
        className={cn(
          'text-sm font-normal text-foreground',
          hideLabel && 'sr-only',
          labelClassName,
        )}
      >
        {label}
        {required && (
          <span aria-hidden className="-ml-1 text-base leading-none text-required">
            *
          </span>
        )}
      </Label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy, required })}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-xs text-destructive">
          <CircleAlertIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {description && (
        <p id={descriptionId} className="text-xs text-meta">
          {description}
        </p>
      )}
    </div>
  )
}
