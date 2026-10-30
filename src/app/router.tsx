import type { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { RouteError } from '@/components/common/RouteError'
import { NotFound } from '@/components/common/NotFound'
import { ensureSession } from '@/features/auth/session'
import { parseSearch, stringifySearch } from '@/lib/search-params'
import { routeTree } from '@/routeTree.gen'

export interface RouterContext {
  queryClient: QueryClient
  /** Resolves the signed-in user (or null) for route guards. */
  getUser: () => ReturnType<typeof ensureSession>
}

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient, getUser: () => ensureSession(queryClient) },
    parseSearch,
    stringifySearch,
    defaultPreload: 'intent',
    // Route loaders only prime TanStack Query; freshness is owned by the query cache.
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    defaultNotFoundComponent: () => <NotFound />,
    defaultErrorComponent: RouteError,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
  interface StaticDataRouteOption {
    /** Pages behind authentication: a session expiry sends the visitor to the login page. */
    requiresAuth?: boolean
  }
}
