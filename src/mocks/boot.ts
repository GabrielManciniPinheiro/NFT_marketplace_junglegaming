import { isScenarioId, mockConfig } from './config'

/** Removes every `kurio.*` key (mock database, mock config and the app's session/cart ids). */
export function clearKurioStorage() {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      Object.keys(storage)
        .filter((key) => key.startsWith('kurio.'))
        .forEach((key) => storage.removeItem(key))
    } catch {
      /* ignore */
    }
  }
}

/**
 * URL switches, applied synchronously before the app reads any storage:
 * - `?mock=<scenario>` applies a scenario (see `SCENARIOS`) and keeps it across reloads;
 * - `?mock-reset` restores the seed and signs out.
 * Both are removed from the address bar afterwards.
 */
export function applyMockUrlSwitches() {
  const url = new URL(window.location.href)
  const reset = url.searchParams.has('mock-reset')
  const scenario = url.searchParams.get('mock')
  if (!reset && scenario === null) return

  if (reset) {
    clearKurioStorage()
    mockConfig.reset()
  }
  if (scenario && isScenarioId(scenario)) mockConfig.applyScenario(scenario)
  url.searchParams.delete('mock-reset')
  url.searchParams.delete('mock')
  window.history.replaceState(window.history.state, '', url)
}
