import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

/**
 * SPA navigation accessibility: after a path change, focus moves to the main landmark and
 * the new page title is announced. Search-param changes (filters, pagination) keep focus.
 */
export function RouteFocus() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const previous = useRef(pathname)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    const timer = window.setTimeout(() => {
      document.getElementById('main-content')?.focus({ preventScroll: true })
      setAnnouncement(document.title)
    }, 60)
    return () => window.clearTimeout(timer)
  }, [pathname])

  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement}
    </p>
  )
}
