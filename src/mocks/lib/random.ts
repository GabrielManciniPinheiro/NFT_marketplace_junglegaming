/** Deterministic PRNG (mulberry32) so fixtures and simulated latency are reproducible. */
export function createRandom(seed: number) {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!,
    chance: (probability: number) => next() < probability,
  }
}

/** FNV-1a based hex digest — deterministic fake hashes (tx hashes, addresses). */
export function hexDigest(input: string, length = 64) {
  let out = ''
  let round = 0
  while (out.length < length) {
    let hash = 0x811c9dc5 ^ round
    for (const char of `${round}:${input}`) {
      hash ^= char.charCodeAt(0)
      hash = Math.imul(hash, 0x01000193)
    }
    out += (hash >>> 0).toString(16).padStart(8, '0')
    round++
  }
  return out.slice(0, length)
}

/** Stable JSON (sorted keys) used to fingerprint idempotent requests. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
      )
      .join(',')}}`
  }
  return JSON.stringify(value)
}
