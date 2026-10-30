import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { AuthResponse } from '@/api/contracts'
import { safeRedirect, startSession } from './session'

/** Shared post-login/register step: open the session, report the cart merge, go back. */
export function useAuthSuccess(redirect: string | undefined) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return (auth: AuthResponse, message: string) => {
    startSession(queryClient, auth)
    toast.success(message)
    const merge = auth.cartMerge
    if (merge?.adjusted.length) {
      toast.warning(
        `Ajustamos seu carrinho à disponibilidade: ${merge.adjusted
          .map((item) => `${item.name} (${item.editionLabel}) ficou com ${item.kept}`)
          .join('; ')}.`,
      )
    } else if (merge && merge.mergedLines > 0) {
      toast.info(
        'Os itens que você escolheu como visitante foram mantidos no carrinho da sua conta.',
      )
    }
    void navigate({ href: safeRedirect(redirect), replace: true })
  }
}
