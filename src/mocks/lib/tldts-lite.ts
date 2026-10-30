/**
 * Lightweight stand-in for `tldts` (a ~260 KB public-suffix list) that `tough-cookie` pulls
 * into MSW's cookie store. The simulated API authenticates with Bearer tokens and never sets
 * cookies, so an eTLD+1 approximation is enough. Wired through `resolve.alias` in
 * vite.config.ts (see ARCHITECTURE.md › Performance).
 */
export function getDomain(hostname: string): string | null {
  const host = hostname.replace(/\.$/, '').toLowerCase()
  if (!host) return null
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) return host
  const labels = host.split('.')
  return labels.length <= 2 ? host : labels.slice(-2).join('.')
}

export default { getDomain }
