import { Outlet, createRootRouteWithContext, useMatches } from '@tanstack/react-router'
import type { RouterContext } from '@/app/router'
import { NotFound } from '@/components/common/NotFound'
import { AppFooter } from '@/components/layout/AppFooter'
import { AppHeader } from '@/components/layout/AppHeader'
import { RealtimeBanner } from '@/components/layout/RealtimeBanner'
import { RouteFocus } from '@/components/layout/RouteFocus'
import { SessionManager } from '@/components/layout/SessionManager'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => <NotFound />,
})

function RootLayout() {
  const bare = useMatches({
    select: (matches) => matches.some((match) => match.staticData?.bareLayout),
  })
  return (
    <RealtimeProvider>
      <TooltipProvider delayDuration={300}>
        <a
          href="#main-content"
          className="sr-only rounded-sm bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Pular para o conteúdo
        </a>
        <div className="flex min-h-dvh flex-col">
          {!bare && <AppHeader />}
          <RealtimeBanner />
          <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
            <Outlet />
          </main>
          {!bare && <AppFooter />}
        </div>
        <Toaster position="bottom-right" closeButton />
        <SessionManager />
        <RouteFocus />
      </TooltipProvider>
    </RealtimeProvider>
  )
}
