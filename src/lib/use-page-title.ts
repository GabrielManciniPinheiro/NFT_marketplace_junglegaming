import { useEffect } from 'react'

const BASE_TITLE = 'Kurio — Marketplace de NFTs'

/** Sets the document title for the current page (announced by RouteFocus on navigation). */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} | Kurio` : BASE_TITLE
  }, [title])
}
