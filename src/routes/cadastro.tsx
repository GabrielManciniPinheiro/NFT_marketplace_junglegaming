import { createFileRoute } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { RegisterFooter, RegisterForm } from '@/features/auth/components/RegisterForm'
import { SignedInNotice } from '@/features/auth/components/SignedInNotice'
import { SocialSignIn } from '@/features/auth/components/SocialSignIn'
import { validateAuthSearch } from '@/features/auth/search'
import { useSession } from '@/features/auth/session'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/cadastro')({
  validateSearch: validateAuthSearch,
  staticData: { bareLayout: true },
  component: RegisterPage,
})

function RegisterPage() {
  usePageTitle('Criar conta')
  const search = Route.useSearch()
  const { user, isResolving } = useSession()

  return (
    <AuthLayout title="Criar perfil de colecionador" footer={<RegisterFooter search={search} />}>
      {isResolving ? (
        <Skeleton className="h-80 w-full rounded-lg" />
      ) : user ? (
        <SignedInNotice user={user} />
      ) : (
        <div className="space-y-8">
          <RegisterForm search={search} />
          <SocialSignIn />
        </div>
      )}
    </AuthLayout>
  )
}
