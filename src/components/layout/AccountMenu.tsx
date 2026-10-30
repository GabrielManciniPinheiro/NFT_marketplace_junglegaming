import { Link, useRouterState } from '@tanstack/react-router'
import { LogInIcon } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/session'

// Signed-in only: keeps the menu/popper code out of the critical bundle for visitors.
const AccountDropdown = lazy(() => import('./AccountDropdown'))

/** "Entrar" for visitors (keeps the current page as return target) or the account menu. */
export function AccountMenu() {
  const { user, isResolving } = useSession()
  const href = useRouterState({ select: (state) => state.location.href })

  if (isResolving) return <Skeleton className="h-8 w-20" />

  if (!user) {
    const onAuthPage = href.startsWith('/entrar') || href.startsWith('/cadastro')
    return (
      <Button asChild size="sm" className="h-8 gap-1.5 px-2.5">
        <Link to="/entrar" search={onAuthPage ? {} : { redirect: href }}>
          <LogInIcon aria-hidden />
          Entrar
        </Link>
      </Button>
    )
  }

  return (
    <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
      <AccountDropdown user={user} />
    </Suspense>
  )
}
