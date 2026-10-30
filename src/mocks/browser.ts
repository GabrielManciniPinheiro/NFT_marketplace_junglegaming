import { setupWorker } from 'msw/browser'
import { mockControl } from './control'
import { store } from './db/store'
import { resumeSettlements } from './domain/commerce'
import { handlers } from './handlers'
import { API } from './lib/http'

export const worker = setupWorker(...handlers)

/**
 * Boots the simulated backend: mock database (persisted seed), service worker and the
 * control API. URL switches (`?mock=`, `?mock-reset`) are applied earlier by `boot.ts`.
 */
export async function startMocks() {
  await store.init()
  await worker.start({
    serviceWorker: { url: '/mockServiceWorker.js' },
    quiet: import.meta.env.PROD,
    onUnhandledRequest(request, print) {
      if (new URL(request.url).pathname.startsWith(API)) print.warning()
    },
  })

  resumeSettlements()
  window.__kurioMock = mockControl
}

/** Loads the Mock Lab panel once the page is idle, so it never competes with the app. */
export function mountMockLab() {
  if (localStorage.getItem('kurio.mock.lab') === 'hidden') return
  const load = () => void import('./devtools/mount').then(({ mount }) => mount())
  if ('requestIdleCallback' in window) window.requestIdleCallback(load, { timeout: 3_000 })
  else setTimeout(load, 1_500)
}
