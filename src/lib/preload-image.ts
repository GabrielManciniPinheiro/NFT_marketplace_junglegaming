import type { Image } from '@/api/contracts'

/**
 * Starts downloading the LCP artwork as soon as its URL is known (when the API answers),
 * instead of waiting for React to render the <picture>. Mirrors the AVIF <source>.
 */
export function preloadImage(image: Image, sizes: string) {
  if (typeof document === 'undefined') return
  const id = `preload:${image.src}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'preload'
  link.as = 'image'
  link.type = 'image/avif'
  link.setAttribute('imagesrcset', image.srcSetAvif)
  link.setAttribute('imagesizes', sizes)
  link.setAttribute('fetchpriority', 'high')
  document.head.append(link)
}
