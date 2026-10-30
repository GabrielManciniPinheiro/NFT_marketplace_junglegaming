import type { User } from '@/api/contracts'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/format'

export function UserAvatar({
  user,
  className,
}: {
  user: Pick<User, 'displayName' | 'avatarUrl'>
  className?: string
}) {
  return (
    <Avatar className={className}>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
      <AvatarFallback className="bg-surface-2 text-xs font-bold text-brand">
        {initials(user.displayName)}
      </AvatarFallback>
    </Avatar>
  )
}
