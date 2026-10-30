import { createFileRoute } from '@tanstack/react-router'
import { ErrorState } from '@/components/common/ErrorState'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AvatarSection,
  PasswordForm,
  ProfileDataForm,
} from '@/features/account/components/ProfileForms'
import { useProfile } from '@/features/account/queries'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/_auth/perfil/')({
  component: ProfilePage,
})

function ProfilePage() {
  usePageTitle('Dados do perfil')
  const profile = useProfile()

  return (
    <div className="space-y-8">
      <h1 className="sr-only">Dados do perfil</h1>
      {profile.isPending ? (
        <div className="space-y-5" aria-hidden>
          <div className="flex items-center gap-5">
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        </div>
      ) : profile.isError ? (
        <ErrorState
          title="Não foi possível carregar seu perfil"
          error={profile.error}
          onRetry={() => void profile.refetch()}
          retrying={profile.isFetching}
        />
      ) : (
        <>
          <AvatarSection profile={profile.data} />
          <Separator />
          <ProfileDataForm key={profile.data.id} profile={profile.data} />
          <Separator />
          <PasswordForm />
        </>
      )}
    </div>
  )
}
