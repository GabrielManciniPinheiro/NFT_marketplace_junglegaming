import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createQueryClient } from './app/query-client'
import { createAppRouter } from './app/router'
import { env } from './config/env'
import './index.css'

const queryClient = createQueryClient()
const router = createAppRouter(queryClient)

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
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
  afterRender?.()
})
