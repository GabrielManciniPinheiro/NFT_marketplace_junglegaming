import { setupWorker } from 'msw/browser'
import { isScenarioId, mockConfig } from './config'
import { clearKurioStorage, mockControl } from './control'
import { clearPersistedDb, store } from './db/store'
import { resumeSettlements } from './domain/commerce'
import { handlers } from './handlers'
import { API } from './lib/http'

export const worker = setupWorker(...handlers)

/**
 * Boots the simulated backend before the app renders.
 *
 * URL switches (useful for demos and shareable links):
 * - `?mock=<scenario>` applies a scenario (see `SCENARIOS`) and keeps it across reloads;
 * - `?mock-reset` restores the seed and signs out before the app starts.
 */
export async function startMocks() {
  const url = new URL(window.location.href)

  if (url.searchParams.has('mock-reset')) {
    clearKurioStorage()
    clearPersistedDb()
    mockConfig.reset()
    url.searchParams.delete('mock-reset')
  }
  const scenario = url.searchParams.get('mock')
  if (scenario && isScenarioId(scenario)) mockConfig.applyScenario(scenario)
  url.searchParams.delete('mock')
  window.history.replaceState(window.history.state, '', url)

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
