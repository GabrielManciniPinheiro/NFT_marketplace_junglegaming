/**
 * Storage access that never throws (private mode, blocked cookies, quota).
 * Values are JSON encoded.
 */
function safeStorage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

function createStore(kind: 'local' | 'session') {
  return {
    get<T>(key: string): T | null {
      try {
        const raw = safeStorage(kind)?.getItem(key)
        return raw == null ? null : (JSON.parse(raw) as T)
      } catch {
        return null
      }
    },
    set(key: string, value: unknown) {
      try {
        safeStorage(kind)?.setItem(key, JSON.stringify(value))
      } catch {
        /* storage unavailable: state stays in memory only */
      }
    },
    remove(key: string) {
      try {
        safeStorage(kind)?.removeItem(key)
      } catch {
        /* ignore */
      }
    },
  }
}

export const local = createStore('local')
export const session = createStore('session')
