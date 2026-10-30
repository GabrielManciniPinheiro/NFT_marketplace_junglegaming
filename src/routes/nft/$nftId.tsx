import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { isApiError } from '@/api/errors'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { NotFound } from '@/components/common/NotFound'
import { Gallery } from '@/features/nft/components/Gallery'
import { NftDetailSkeleton } from '@/features/nft/components/NftDetailSkeleton'
import { NftInfoTabs, type InfoTab } from '@/features/nft/components/NftInfoTabs'
import { PurchasePanel } from '@/features/nft/components/PurchasePanel'
import { RelatedNfts } from '@/features/nft/components/RelatedNfts'
import { nftDetailQueryOptions, relatedNftsQueryOptions } from '@/features/nft/queries'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/nft/$nftId')({
  // Prefetch on hover/intent and on direct access; rendering reads from the query cache.
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftDetailQueryOptions(params.nftId))
    void context.queryClient.prefetchQuery(relatedNftsQueryOptions(params.nftId))
  },
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const detail = useQuery(nftDetailQueryOptions(nftId))
  const [tab, setTab] = useState<InfoTab>('detalhes')
  const notFound = isApiError(detail.error) && detail.error.is('NOT_FOUND')
  usePageTitle(detail.data?.name ?? (notFound ? 'NFT não encontrado' : 'NFT'), {
    provisional: detail.isPending,
  })

  if (notFound) {
    return (
      <NotFound
        title="NFT não encontrado"
        description="Este NFT não existe ou foi removido do catálogo. Que tal explorar outras obras?"
      />
    )
  }

  const showReviews = () => {
    setTab('avaliacoes')
    document.getElementById('nft-info')?.scrollIntoView({ block: 'start' })
  }

  return (
    <div className="page-container space-y-12 py-8 md:space-y-16">
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Início', link: { to: '/' } },
            { label: 'Mercado', link: { to: '/mercado' } },
          ]}
        />
        {detail.isPending ? (
          <NftDetailSkeleton />
        ) : detail.isError ? (
          <ErrorState
            title="Não foi possível carregar este NFT"
            error={detail.error}
            onRetry={() => void detail.refetch()}
            retrying={detail.isFetching}
          />
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]">
            <Gallery key={`gallery-${detail.data.id}`} nft={detail.data} />
            <PurchasePanel
              key={`purchase-${detail.data.id}`}
              nft={detail.data}
              onShowReviews={showReviews}
            />
          </div>
        )}
      </div>

      {detail.data ? (
        <NftInfoTabs nft={detail.data} tab={tab} onTabChange={setTab} />
      ) : detail.isPending ? (
        // Reserves the tabs' footprint so the sections below do not shift when data arrives.
        <div aria-hidden className="space-y-5">
          <Skeleton className="h-9 w-80 max-w-full" />
          <Skeleton className="h-[30rem] w-full sm:h-[22rem]" />
        </div>
      ) : null}
      <RelatedNfts nftId={nftId} />
    </div>
  )
}
