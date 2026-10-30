import { RefreshCwIcon, TriangleAlertIcon } from 'lucide-react'
import { cn } from 'cn'
import { getErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  error?: unknown
  message?: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
}

/** Inline failure feedback with a retry action (announced to assistive tech). */
export function ErrorState({
  title = 'Não foi possível carregar',
  error,
  message,
  onRetry,
  retrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-destructive/40 bg-surface px-6 py-10 text-center',
        className,
      )}
    >
      <TriangleAlertIcon className="size-6 text-destructive" aria-hidden />
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-sand">{message ?? getErrorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} disabled={retrying}>
          <RefreshCwIcon className={cn(retrying && 'motion-safe:animate-spin')} aria-hidden />
          {retrying ? 'Tentando novamente…' : 'Tentar novamente'}
        </Button>
      )}
    </div>
  )
}
