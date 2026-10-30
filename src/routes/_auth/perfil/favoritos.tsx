import { Link, createFileRoute } from '@tanstack/react-router'
import { HeartIcon, HeartOffIcon } from 'lucide-react'
import type { NftSummary } from '@/api/contracts'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/NftCard'
import { useFavorites, useToggleFavorite } from '@/features/favorites/queries'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/_auth/perfil/favoritos')({
  component: FavoritesPage,
})

function RemoveFavorite({ nft }: { nft: NftSummary }) {
  const toggle = useToggleFavorite(nft.id)
  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative z-10 w-full text-sand"
      onClick={() => toggle.mutate({ nft, favorite: false })}
      disabled={toggle.isPending}
    >
      <HeartOffIcon aria-hidden />
      Remover<span className="sr-only"> {nft.name} da lista de interesse</span>
    </Button>
  )
}

function FavoritesPage() {
  usePageTitle('Lista de interesse')
  const favorites = useFavorites()
  const items = favorites.data?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[0.9375rem] font-bold">Lista de interesse</h1>
        <p className="text-xs text-sand">NFTs que você favoritou ficam salvos na sua conta.</p>
      </div>

      {favorites.isPending ? (
        <ul
          className="grid grid-cols-2 gap-x-4 gap-y-7 lg:grid-cols-3"
          aria-label="Carregando favoritos"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index}>
              <NftCardSkeleton />
            </li>
          ))}
        </ul>
      ) : favorites.isError ? (
        <ErrorState
          title="Não foi possível carregar seus favoritos"
          error={favorites.error}
          onRetry={() => void favorites.refetch()}
          retrying={favorites.isFetching}
        />
      ) : items.length === 0 ? (
        <Empty className="border border-dashed border-border py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HeartIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Sua lista de interesse está vazia</EmptyTitle>
            <EmptyDescription>
              Toque em “Favoritar” em qualquer NFT para acompanhá-lo por aqui.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/mercado">Explorar o mercado</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-7 lg:grid-cols-3">
          {items.map((favorite) => (
            <li key={favorite.nftId} className="space-y-2">
              <NftCard nft={favorite.nft} />
              <RemoveFavorite nft={favorite.nft} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
