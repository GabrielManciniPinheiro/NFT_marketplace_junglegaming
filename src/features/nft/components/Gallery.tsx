import { ZoomInIcon } from 'lucide-react'
import { useState } from 'react'
import { cn } from 'cn'
import type { NftDetail } from '@/api/contracts'
import { NftImage } from '@/components/common/NftImage'
import { DETAIL_IMAGE_SIZES } from '../queries'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

/** Thumbnails (column on desktop, row on mobile) + main artwork with a zoom dialog. */
export function Gallery({ nft }: { nft: NftDetail }) {
  const [selected, setSelected] = useState(0)
  const image = nft.gallery[selected] ?? nft.gallery[0]!

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-5">
      <ul
        aria-label="Imagens do NFT"
        className="grid grid-cols-4 gap-3 sm:flex sm:w-[6.25rem] sm:flex-col sm:gap-4"
      >
        {nft.gallery.map((item, index) => (
          <li key={item.src}>
            <button
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Ver imagem ${index + 1} de ${nft.gallery.length}: ${item.alt}`}
              aria-pressed={index === selected}
              className={cn(
                'block w-full overflow-hidden rounded-md border-2 transition-colors focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none',
                index === selected
                  ? 'border-primary'
                  : 'border-transparent hover:border-primary/50',
              )}
            >
              <NftImage image={item} sizes="100px" decorative className="rounded-[0.3rem]" />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative min-w-0 flex-1 rounded-md bg-surface p-3 sm:p-4">
        <NftImage image={image} sizes={DETAIL_IMAGE_SIZES} priority className="rounded-xl" />
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Ampliar imagem"
              className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-background focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ZoomInIcon className="size-4" aria-hidden />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[min(90vw,48rem)] border-border bg-surface p-3 sm:max-w-[min(90vw,48rem)]">
            <DialogTitle className="sr-only">{nft.name}</DialogTitle>
            <DialogDescription className="sr-only">{image.alt}</DialogDescription>
            <img
              src={image.src.replace('-640.', '-960.')}
              alt={image.alt}
              width={960}
              height={960}
              className="aspect-square h-auto w-full rounded-lg object-cover"
              style={{ backgroundColor: image.dominantColor }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
