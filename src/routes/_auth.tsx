import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

/** Pathless layout guarding checkout, orders and account pages. */
export const Route = createFileRoute('/_auth')({
  staticData: { requiresAuth: true },
  beforeLoad: async ({ context, location }) => {
    const user = await context.getUser()
    if (!user) throw redirect({ to: '/entrar', search: { redirect: location.href } })
    return { user }
  },
  component: Outlet,
})
