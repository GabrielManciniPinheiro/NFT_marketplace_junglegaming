import { cn } from 'cn'
import type { Image } from '@/api/contracts'

interface NftImageProps {
  image: Image
  /** Rendered width hint for the browser's srcset choice. */
  sizes: string
  className?: string
  /** Above-the-fold images load eagerly with high priority (LCP). */
  priority?: boolean
  /** Decorative usage (e.g. thumbnails next to the name) hides it from assistive tech. */
  decorative?: boolean
}

/**
 * Responsive artwork: AVIF → WebP via <picture>, intrinsic size to prevent layout shift and
 * the artwork's dominant color as placeholder while it loads.
 */
export function NftImage({
  image,
  sizes,
  className,
  priority = false,
  decorative = false,
}: NftImageProps) {
  return (
    <picture>
      <source type="image/avif" srcSet={image.srcSetAvif} sizes={sizes} />
      <source type="image/webp" srcSet={image.srcSetWebp} sizes={sizes} />
      <img
        src={image.src}
        width={image.width}
        height={image.height}
        alt={decorative ? '' : image.alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        style={{ backgroundColor: image.dominantColor }}
        className={cn('aspect-square h-auto w-full object-cover', className)}
      />
    </picture>
  )
}
