import { useQuery } from '@tanstack/react-query'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/NftCard'
import { relatedNftsQueryOptions } from '../queries'

export function RelatedNfts({
  nftId,
  title = 'Mais desta coleção',
}: {
  nftId: string
  title?: string
}) {
  const { data, isPending, isError } = useQuery(relatedNftsQueryOptions(nftId))
  if (isError || (data && data.items.length === 0)) return null

  return (
    <section aria-labelledby="related-title" className="space-y-6">
      <h2 id="related-title" className="border-b border-border pb-3 text-base font-bold text-brand">
        {title}
      </h2>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5">
        {isPending
          ? Array.from({ length: 5 }, (_, index) => (
              <li key={index}>
                <NftCardSkeleton />
              </li>
            ))
          : data.items.map((nft) => (
              <li key={nft.id}>
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>
    </section>
  )
}
