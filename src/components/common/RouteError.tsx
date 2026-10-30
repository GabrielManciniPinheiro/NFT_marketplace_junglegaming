import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ErrorState } from './ErrorState'

/** Route-level error boundary: retry re-runs loaders and resets failed queries. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const queryErrorBoundary = useQueryErrorResetBoundary()

  useEffect(() => {
    queryErrorBoundary.reset()
  }, [queryErrorBoundary])

  return (
    <div className="page-container py-16">
      <ErrorState
        title="Algo deu errado nesta página"
        error={error}
        onRetry={() => {
          reset()
          void router.invalidate()
        }}
      />
      <p className="mt-6 text-center text-sm">
        <Link to="/" className="text-brand underline-offset-4 hover:underline">
          Voltar para o início
        </Link>
      </p>
    </div>
  )
}
