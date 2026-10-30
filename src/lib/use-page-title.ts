import { useMatch } from '@tanstack/react-router'
import { useEffect } from 'react'

const BASE_TITLE = 'Kurio — Marketplace de NFTs'

interface TitleClaim {
  /** Path of the route that set the title (not the address bar, which changes first). */
  pathname: string
  /** Placeholder shown while the page's data loads (e.g. "NFT" before the name arrives). */
  provisional: boolean
}

let claim: TitleClaim | null = null
const listeners = new Set<() => void>()

const normalize = (pathname: string) => (pathname.length > 1 ? pathname.replace(/\/$/, '') : '/')

/** Lets RouteFocus announce a navigation only once the new page has set its final title. */
export const pageTitle = {
  isFinalFor: (pathname: string) =>
    claim !== null && !claim.provisional && claim.pathname === normalize(pathname),
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

/** Sets the document title for the current page (announced by RouteFocus on navigation). */
export function usePageTitle(
  title?: string | null,
  { provisional = false }: { provisional?: boolean } = {},
) {
  const pathname = useMatch({ strict: false, select: (match) => match.pathname })

  useEffect(() => {
    document.title = title ? `${title} | Kurio` : BASE_TITLE
    claim = { pathname: normalize(pathname), provisional }
    listeners.forEach((listener) => listener())
  }, [title, provisional, pathname])
}
