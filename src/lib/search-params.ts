/** Encodes values as `key=a,b` (arrays) and drops empty ones. Shared by Axios and the router. */
export function toSearchParams(query: Record<string, unknown>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(','))
    } else {
      params.set(key, String(value))
    }
  }
  return params
}

/** Router search parser: every value stays a string; route schemas coerce and validate. */
export function parseSearch(search: string) {
  return Object.fromEntries(new URLSearchParams(search.startsWith('?') ? search.slice(1) : search))
}

export function stringifySearch(search: Record<string, unknown>) {
  const params = toSearchParams(search).toString()
  return params ? `?${params}` : ''
}
