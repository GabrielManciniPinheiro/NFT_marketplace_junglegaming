import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { authApi } from '@/api/endpoints'
import { endSession } from './session'

/** Revokes the session server-side (best effort) and always clears it locally. */
export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: () => authApi.logout().catch(() => undefined),
    onSettled: () => {
      endSession(queryClient)
      toast.success('Você saiu da sua conta.')
      if (router.state.matches.some((match) => match.staticData?.requiresAuth)) {
        void router.navigate({ to: '/' })
      }
    },
  })
}
