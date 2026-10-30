import type { User } from '@/api/contracts'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/format'

export function UserAvatar({
  user,
  className,
  decorative = false,
}: {
  user: Pick<User, 'displayName' | 'avatarUrl'>
  className?: string
  /** Hide from assistive tech when a sibling already names the person. */
  decorative?: boolean
}) {
  return (
    <Avatar className={className} aria-hidden={decorative || undefined}>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
      <AvatarFallback className="bg-surface-2 text-xs font-bold text-brand">
        {initials(user.displayName)}
      </AvatarFallback>
    </Avatar>
  )
}
