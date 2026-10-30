import { createFileRoute } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { LoginFooter, LoginForm } from '@/features/auth/components/LoginForm'
import { SignedInNotice } from '@/features/auth/components/SignedInNotice'
import { SocialSignIn } from '@/features/auth/components/SocialSignIn'
import { validateAuthSearch } from '@/features/auth/search'
import { useSession } from '@/features/auth/session'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/entrar')({
  validateSearch: validateAuthSearch,
  staticData: { bareLayout: true },
  component: LoginPage,
})

function LoginPage() {
  usePageTitle('Entrar')
  const search = Route.useSearch()
  const { user, isResolving } = useSession()

  return (
    <AuthLayout title="Entrar" footer={<LoginFooter search={search} />}>
      {isResolving ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : user ? (
        <SignedInNotice user={user} />
      ) : (
        <div className="space-y-8">
          <LoginForm search={search} />
          <SocialSignIn />
        </div>
      )}
    </AuthLayout>
  )
}
