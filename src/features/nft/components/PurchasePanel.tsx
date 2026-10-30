import { useNavigate, useRouterState } from '@tanstack/react-router'
import { HeartIcon, MailIcon, StarIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { cn } from 'cn'
import type { EditionId, NftDetail } from '@/api/contracts'
import { getErrorMessage } from '@/api/errors'
import { LinkedInIcon, TwitterIcon } from '@/components/common/BrandIcons'
import { EthAmount } from '@/components/common/EthAmount'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { useSession } from '@/features/auth/session'
import { useAddToCart } from '@/features/cart/mutations'
import { useCart } from '@/features/cart/queries'
import { useIsFavorite, useToggleFavorite } from '@/features/favorites/queries'
import { formatEth } from '@/lib/eth'

function defaultEdition(nft: NftDetail): EditionId {
  const preferred = nft.editions.find(
    (edition) => edition.id === nft.defaultEdition && edition.available > 0,
  )
  return (preferred ?? nft.editions.find((edition) => edition.available > 0) ?? nft.editions[0]!).id
}

export function Rating({
  average,
  count,
  onShowReviews,
}: {
  average: number
  count: number
  onShowReviews: () => void
}) {
  const filled = Math.round(average)
  return (
    <button
      type="button"
      onClick={onShowReviews}
      className="flex items-center gap-2 rounded-sm text-sm text-soft hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: 5 }, (_, index) => (
          <StarIcon
            key={index}
            className={cn('size-3.5', index < filled ? 'fill-primary text-primary' : 'text-meta')}
          />
        ))}
      </span>
      <span className="sr-only">Nota média {average.toLocaleString('pt-BR')} de 5,</span>
      {count} {count === 1 ? 'avaliação' : 'avaliações'} de colecionadores
    </button>
  )
}

function ShareLinks({ nft }: { nft: NftDetail }) {
  const url = typeof window === 'undefined' ? '' : window.location.href
  const text = `${nft.name} na Kurio`
  const links = [
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      icon: LinkedInIcon,
    },
    {
      label: 'e-mail',
      href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
      icon: MailIcon,
    },
    {
      label: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      icon: TwitterIcon,
    },
  ]
  return (
    <div className="flex items-center gap-3">
      <p className="text-sm font-bold">Compartilhar este NFT:</p>
      <ul className="flex items-center gap-2">
        {links.map(({ label, href, icon: Icon }) => (
          <li key={label}>
            <a
              href={href}
              target={href.startsWith('mailto') ? undefined : '_blank'}
              rel="noopener noreferrer"
              aria-label={`Compartilhar por ${label}${href.startsWith('mailto') ? '' : ' (abre em nova aba)'}`}
              className="grid size-7 place-items-center rounded-sm text-foreground transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Icon className="size-4" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Announces live price changes (nft.updated) for the NFT on screen. */
function PriceAnnouncer({ price }: { price: string }) {
  const [initial] = useState(price)
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {price !== initial ? `Preço atualizado em tempo real: ${formatEth(price)} ETH` : ''}
    </p>
  )
}

export function PurchasePanel({
  nft,
  onShowReviews,
}: {
  nft: NftDetail
  onShowReviews: () => void
}) {
  const navigate = useNavigate()
  const href = useRouterState({ select: (state) => state.location.href })
  const { user } = useSession()
  const { data: cart } = useCart()
  const addToCart = useAddToCart()
  const isFavorite = useIsFavorite(nft.id)
  const toggleFavorite = useToggleFavorite(nft.id)
  const [editionId, setEditionId] = useState<EditionId>(() => defaultEdition(nft))
  const [quantity, setQuantity] = useState(1)
  const availabilityId = useId()

  const edition = nft.editions.find((item) => item.id === editionId) ?? nft.editions[0]!
  const inCart =
    cart?.items.find((item) => item.nftId === nft.id && item.edition === edition.id)?.quantity ?? 0
  const limit = Math.min(edition.available, edition.maxPerOrder)
  const remaining = Math.max(0, limit - inCart)
  const effectiveQuantity = Math.min(quantity, Math.max(remaining, 1))
  const soldOut = edition.available === 0
  const canBuy = !soldOut && remaining > 0

  const availability = soldOut
    ? 'Edição esgotada'
    : remaining === 0
      ? `Você já tem o máximo desta edição no carrinho (${inCart}).`
      : `${edition.supply === null ? 'Edição aberta' : `${edition.available} disponíveis`} · máx. ${edition.maxPerOrder} por pedido${inCart ? ` · ${inCart} no carrinho` : ''}`

  function buy() {
    addToCart.mutate(
      { nftId: nft.id, edition: edition.id, quantity: effectiveQuantity },
      {
        onSuccess: () => {
          toast.success(`${nft.name} (${edition.label}) foi adicionado ao carrinho.`)
          void navigate({ to: '/carrinho' })
        },
      },
    )
  }

  function favorite() {
    if (!user) {
      toast.info('Entre na sua conta para salvar NFTs na lista de interesse.')
      void navigate({ to: '/entrar', search: { redirect: href } })
      return
    }
    toggleFavorite.mutate({ nft, favorite: !isFavorite })
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold sm:text-[1.75rem]">{nft.name}</h1>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p className="flex items-baseline gap-3 text-xl font-bold sm:text-[1.375rem]">
            <EthAmount
              key={edition.price}
              value={edition.price}
              className="text-brand motion-safe:animate-in motion-safe:fade-in"
              label="Preço"
            />
            {edition.id === nft.defaultEdition && nft.previousPrice && (
              <EthAmount
                value={nft.previousPrice}
                strike
                label="Preço anterior"
                className="text-base font-normal text-meta"
              />
            )}
          </p>
          <Rating
            average={nft.rating.average}
            count={nft.rating.count}
            onShowReviews={onShowReviews}
          />
        </div>
        <PriceAnnouncer price={edition.price} />
      </div>

      <Separator />

      <div className="space-y-2">
        <h2 className="text-sm font-bold">Sobre este NFT:</h2>
        <p className="text-sm leading-relaxed text-sand">{nft.description}</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-bold">Edição:</legend>
        <div className="flex flex-wrap gap-2">
          {nft.editions.map((item) => {
            const checked = item.id === edition.id
            const unavailable = item.available === 0
            return (
              <label
                key={item.id}
                className={cn(
                  'relative cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors',
                  'has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-background',
                  checked
                    ? 'border-primary text-foreground'
                    : 'border-border text-sand hover:border-primary/60',
                  unavailable && 'cursor-not-allowed line-through opacity-50 hover:border-border',
                )}
              >
                <input
                  type="radio"
                  name="edition"
                  value={item.id}
                  checked={checked}
                  disabled={unavailable}
                  onChange={() => {
                    setEditionId(item.id)
                    setQuantity(1)
                  }}
                  className="sr-only"
                />
                {item.label}
                {unavailable && <span className="sr-only"> (esgotada)</span>}
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <QuantityStepper
          value={effectiveQuantity}
          max={Math.max(remaining, 1)}
          onChange={setQuantity}
          label={`Quantidade da edição ${edition.label}`}
          disabled={!canBuy}
          describedBy={availabilityId}
        />
        <div className="flex flex-1 flex-wrap justify-end gap-3">
          <Button
            onClick={buy}
            disabled={!canBuy || addToCart.isPending}
            className="min-w-[8.5rem] px-6 uppercase"
          >
            {addToCart.isPending ? <Spinner aria-hidden /> : null}
            {addToCart.isPending ? 'Adicionando…' : soldOut ? 'Esgotado' : 'Comprar'}
          </Button>
          <Button
            variant="outline"
            onClick={favorite}
            aria-pressed={user ? isFavorite : undefined}
            className="min-w-[8.5rem] px-4"
          >
            <HeartIcon
              className={cn('size-4', isFavorite && 'fill-brand text-brand')}
              aria-hidden
            />
            {isFavorite ? 'Favoritado' : 'Favoritar'}
          </Button>
        </div>
      </div>

      <p
        id={availabilityId}
        className={cn(
          '-mt-2 text-xs',
          soldOut || remaining === 0 ? 'text-destructive' : 'text-meta',
        )}
      >
        {availability}
      </p>

      {addToCart.isError && (
        <p role="alert" className="-mt-2 text-sm text-destructive">
          {getErrorMessage(addToCart.error)}
        </p>
      )}

      <dl className="space-y-2 text-sm text-meta">
        <div className="flex gap-1.5">
          <dt>ID do token:</dt>
          <dd>{nft.tokenId}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Coleção:</dt>
          <dd>{nft.collection.name}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Atributos:</dt>
          <dd>{nft.attributes.join(', ')}</dd>
        </div>
      </dl>

      <ShareLinks nft={nft} />
    </div>
  )
}
