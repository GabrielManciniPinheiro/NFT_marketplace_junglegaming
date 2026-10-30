import { CircleAlertIcon, InfoIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from 'cn'

/** Form-level message (server errors, session notices). Errors are announced immediately. */
export function FormAlert({
  tone = 'error',
  children,
  className,
}: {
  tone?: 'error' | 'info'
  children: ReactNode
  className?: string
}) {
  const Icon = tone === 'error' ? CircleAlertIcon : InfoIcon
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm',
        tone === 'error'
          ? 'border-destructive/50 bg-destructive/10 text-foreground'
          : 'border-primary/40 bg-surface-2 text-sand',
        className,
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-4 shrink-0',
          tone === 'error' ? 'text-destructive' : 'text-brand',
        )}
        aria-hidden
      />
      <div>{children}</div>
    </div>
  )
}
