import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { EthAmount } from '@/components/common/EthAmount'
import { NftImage } from '@/components/common/NftImage'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { highlightsQueryOptions } from '../queries'

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function Countdown({ endsAt }: { endsAt: string }) {
  const now = useNow(1_000)
  const remaining = Math.max(0, Date.parse(endsAt) - now)
  const totalSeconds = Math.floor(remaining / 1_000)
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')

  return (
    <p className="text-center text-xs text-sand">
      {remaining === 0 ? (
        'Oferta encerrada'
      ) : (
        <>
          Termina em{' '}
          <time dateTime={endsAt} className="font-bold text-foreground tabular-nums">
            {days}d {pad(hours)}h {pad(minutes)}m {pad(seconds)}s
          </time>
        </>
      )}
    </p>
  )
}

/** "NFT em destaque — Oferta limitada" block under the filters (highlights API). */
export function SpotlightCard() {
  const { data, isPending } = useQuery(highlightsQueryOptions())
  const spotlight = data?.spotlight

  if (isPending) return <Skeleton className="h-96 w-full rounded-md" />
  if (!spotlight) return null

  return (
    <section
      aria-labelledby="spotlight-title"
      className="flex flex-col gap-4 rounded-md bg-surface-2 p-4"
    >
      <div className="space-y-1">
        <p className="text-lg font-bold tracking-wide text-brand uppercase">NFT em destaque</p>
        <h2
          id="spotlight-title"
          className="text-center text-base font-bold tracking-wide uppercase"
        >
          {spotlight.headline}
        </h2>
      </div>
      <NftImage image={spotlight.nft.image} sizes="270px" decorative className="rounded-lg" />
      <div className="space-y-1 text-center">
        <p className="text-sm text-soft">{spotlight.nft.name}</p>
        <p className="flex flex-wrap items-baseline justify-center gap-x-2 text-sm font-bold">
          <EthAmount value={spotlight.nft.price} className="text-brand" label="Preço" />
          {spotlight.nft.previousPrice && (
            <EthAmount
              value={spotlight.nft.previousPrice}
              strike
              label="Preço anterior"
              className="font-normal text-meta"
            />
          )}
        </p>
      </div>
      <Countdown endsAt={spotlight.endsAt} />
      <Button asChild size="sm">
        <Link to="/nft/$nftId" params={{ nftId: spotlight.nft.id }}>
          Ver oferta<span className="sr-only">: {spotlight.nft.name}</span>
        </Link>
      </Button>
    </section>
  )
}
