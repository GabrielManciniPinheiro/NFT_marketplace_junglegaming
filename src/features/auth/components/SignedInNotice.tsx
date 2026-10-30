import { Link } from '@tanstack/react-router'
import type { User } from '@/api/contracts'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { useLogout } from '../use-logout'

/** Visiting login/register while signed in: continue, or sign out to switch accounts. */
export function SignedInNotice({ user }: { user: User }) {
  const logout = useLogout()
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface p-6 text-center">
      <UserAvatar user={user} className="size-12" />
      <p className="text-sm text-sand">
        Você já está conectado como <strong className="text-foreground">{user.displayName}</strong>.
      </p>
      <div className="flex w-full flex-col gap-2">
        <Button asChild>
          <Link to="/perfil">Ir para o meu perfil</Link>
        </Button>
        <Button variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
          Sair e usar outra conta
        </Button>
      </div>
    </div>
  )
}
