import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import type { NftSummary } from '@/api/contracts'
import { EthAmount } from '@/components/common/EthAmount'
import { NftImage } from '@/components/common/NftImage'
import { Skeleton } from '@/components/ui/skeleton'

const CARD_SIZES = '(min-width: 1280px) 270px, (min-width: 768px) 30vw, 46vw'

interface NftCardProps {
  nft: NftSummary
  priority?: boolean
  className?: string
}

/** Catalog card: framed artwork with name and price below, as in the Figma grid. */
export function NftCard({ nft, priority = false, className }: NftCardProps) {
  const soldOut = nft.available === 0
  return (
    <article className={cn('group relative flex flex-col gap-3', className)}>
      <div className="relative rounded-md bg-surface p-2 transition-colors group-hover:bg-surface-2 sm:p-2.5">
        <NftImage
          image={nft.image}
          sizes={CARD_SIZES}
          priority={priority}
          decorative
          className={cn('rounded-lg transition-transform', soldOut && 'opacity-60 grayscale-[40%]')}
        />
        {soldOut && (
          <span className="absolute top-4 left-4 rounded-sm bg-background/90 px-2 py-1 text-[0.6875rem] font-bold tracking-wider text-soft uppercase">
            Esgotado
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 px-0.5">
        <h3 className="truncate text-sm text-soft sm:text-[0.9375rem]">
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-3 focus-visible:after:ring-ring/70"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold">
          <EthAmount value={nft.price} className="text-brand" label="Preço" />
          {nft.previousPrice && (
            <EthAmount
              value={nft.previousPrice}
              strike
              label="Preço anterior"
              className="font-normal text-meta"
            />
          )}
        </p>
      </div>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="rounded-md bg-surface p-2 sm:p-2.5">
        <Skeleton className="aspect-square w-full rounded-lg bg-surface-2" />
      </div>
      <div className="flex flex-col gap-2 px-0.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  )
}
