import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { env } from './config/env'
import { routeTree } from './routeTree.gen'
import './index.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

/** The MSW layer (REST + Socket.IO) must be listening before the first request goes out. */
async function enableMocks() {
  if (!env.mocksEnabled) return undefined
  const { startMocks, mountMockLab } = await import('./mocks/browser')
  await startMocks()
  return mountMockLab
}

void enableMocks().then((afterRender) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
  afterRender?.()
})
