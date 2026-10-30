import { Link, useRouterState } from '@tanstack/react-router'
import { LogInIcon, LogOutIcon } from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/session'
import { useLogout } from '@/features/auth/use-logout'
import { ACCOUNT_NAV } from './nav'

/** "Entrar" for visitors (keeps the current page as return target) or the account menu. */
export function AccountMenu() {
  const { user, isResolving } = useSession()
  const href = useRouterState({ select: (state) => state.location.href })
  const logout = useLogout()

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={`Conta de ${user.displayName}`}
        >
          <UserAvatar user={user} className="size-8" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">Olá, {user.displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ACCOUNT_NAV.map((item) => (
          <DropdownMenuItem key={item.to} asChild>
            <Link to={item.to}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout.mutate()} className="text-brand">
          <LogOutIcon aria-hidden />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
