import { Link } from '@tanstack/react-router'
import { LogOutIcon } from 'lucide-react'
import type { User } from '@/api/contracts'
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
import { useLogout } from '@/features/auth/use-logout'
import { ACCOUNT_NAV } from './nav'

export default function AccountDropdown({ user }: { user: User }) {
  const logout = useLogout()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          {/* The name comes from text (not aria-label) so it never contradicts the initials. */}
          <UserAvatar user={user} className="size-8" decorative />
          <span className="sr-only">Conta de {user.displayName}</span>
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
