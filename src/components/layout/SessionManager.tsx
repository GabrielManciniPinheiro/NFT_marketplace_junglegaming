import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { credentials } from '@/api/credentials'
import { onSessionInvalid } from '@/api/http'
import { endSession } from '@/features/auth/session'

/**
 * Reacts to 401s on authenticated requests (expired or revoked session) anywhere in the
 * app: private data is dropped immediately, drafts are kept, and protected pages send
 * the collector to the login page with the current location as return target.
 */
export function SessionManager() {
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(
    () =>
      onSessionInvalid((reason) => {
        if (!credentials.getToken()) return // already handled by a concurrent request
        endSession(queryClient, { keepDrafts: true })
        toast.warning(
          reason === 'expired'
            ? 'Sua sessão expirou. Entre novamente para continuar de onde parou.'
            : 'Sua sessão não é mais válida. Entre novamente.',
          { id: 'session-invalid' },
        )
        const { matches, location } = router.state
        if (matches.some((match) => match.staticData?.requiresAuth)) {
          void router.navigate({
            to: '/entrar',
            search: { redirect: location.href, motivo: 'sessao-expirada' },
            replace: true,
          })
        }
      }),
    [queryClient, router],
  )

  return null
}
