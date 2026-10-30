import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { markNetworkReady } from './app/network-gate'
import { createQueryClient } from './app/query-client'
import { createAppRouter } from './app/router'
import { env } from './config/env'
import { applyMockUrlSwitches } from './mocks/boot'
import './index.css'

// Demo URL switches (?mock=, ?mock-reset) must run before anything reads storage.
if (env.mocksEnabled) applyMockUrlSwitches()

/**
 * The MSW layer (REST + Socket.IO) boots in parallel with the first render; the network gate
 * holds requests and the socket until the worker is listening.
 */
const mocks = env.mocksEnabled
  ? import('./mocks/browser').then(async (module) => {
      await module.startMocks()
      return module
    })
  : Promise.resolve(null)

const queryClient = createQueryClient()
const router = createAppRouter(queryClient)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

void mocks.then((module) => {
  markNetworkReady()
  module?.mountMockLab()
})
