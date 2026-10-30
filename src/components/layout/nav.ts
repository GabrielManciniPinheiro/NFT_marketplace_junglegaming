export const MAIN_NAV = [
  { to: '/', label: 'Início', section: 'home' },
  { to: '/mercado', label: 'Mercado', section: 'market' },
  { to: '/criadores', label: 'Criadores', section: 'creators' },
  { to: '/aprenda', label: 'Aprenda', section: 'learn' },
] as const

export type NavSection = (typeof MAIN_NAV)[number]['section']

/** Detail, cart and checkout belong to "Mercado" (as in the Figma breadcrumbs). */
export function sectionOf(pathname: string): NavSection | null {
  if (pathname === '/') return 'home'
  if (/^\/(mercado|nft|carrinho|pagamento|pedidos)(\/|$)/.test(pathname)) return 'market'
  if (pathname.startsWith('/criadores')) return 'creators'
  if (pathname.startsWith('/aprenda')) return 'learn'
  return null
}

export const ACCOUNT_NAV = [
  { to: '/perfil', label: 'Dados do perfil' },
  { to: '/perfil/carteiras', label: 'Carteiras' },
  { to: '/perfil/favoritos', label: 'Lista de interesse' },
] as const
