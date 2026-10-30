import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AccountNav } from '@/features/account/components/AccountNav'

export const Route = createFileRoute('/_auth/perfil')({
  component: AccountLayout,
})

function AccountLayout() {
  return (
    <div className="page-container grid grid-cols-1 items-start gap-6 py-8 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-8 lg:grid-cols-[19.5rem_minmax(0,1fr)] lg:gap-10">
      <AccountNav />
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
