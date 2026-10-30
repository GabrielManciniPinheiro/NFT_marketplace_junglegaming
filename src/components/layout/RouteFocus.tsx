import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { pageTitle } from '@/lib/use-page-title'

/** Longest wait for a page's final title before announcing whatever is there. */
const MAX_TITLE_WAIT_MS = 3_000

/**
 * SPA navigation accessibility: after a path change, focus moves to the main landmark and
 * the new page title is announced. Search-param changes (filters, pagination) keep focus.
 * The announcement waits until the new page has set its final title — not the previous
 * page's title, nor a placeholder shown while its data loads.
 */
export function RouteFocus() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const previous = useRef(pathname)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname

    let focused = false
    let announced = false
    const announce = () => {
      if (announced) return
      announced = true
      setAnnouncement(document.title)
    }
    // Focus first, then announce, so the focus move never cuts the announcement short.
    const announceIfReady = () => {
      if (focused && pageTitle.isFinalFor(pathname)) announce()
    }
    const unsubscribe = pageTitle.subscribe(announceIfReady)
    const focus = window.setTimeout(() => {
      document.getElementById('main-content')?.focus({ preventScroll: true })
      focused = true
      announceIfReady()
    }, 60)
    const fallback = window.setTimeout(announce, MAX_TITLE_WAIT_MS)

    return () => {
      unsubscribe()
      window.clearTimeout(focus)
      window.clearTimeout(fallback)
    }
  }, [pathname])

  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement}
    </p>
  )
}
