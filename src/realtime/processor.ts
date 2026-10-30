import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  isTerminalOrderStatus,
  type Cart,
  type FavoritesResponse,
  type HighlightsResponse,
  type NftDetail,
  type NftListResponse,
  type NftSummary,
  type NftUpdatedEvent,
  type Order,
  type OrderUpdatedEvent,
  type RealtimeEvent,
  type SessionInfo,
} from '@/api/contracts'
import { credentials } from '@/api/credentials'
import { cartKey, queryKeys } from '@/api/query-keys'
import { formatEth } from '@/lib/eth'

const MAX_SEEN_EVENTS = 500

/**
 * Applies Socket.IO events to the query cache.
 *
 * Guarantees: duplicates are dropped by event id; events whose version is not newer than
 * what was already applied (or already cached from REST) are ignored, so state never
 * regresses; private events addressed to another user are discarded.
 */
export function createEventProcessor(queryClient: QueryClient) {
  /** Read at delivery time, so events always see the session that is current *now*. */
  const getUserId = () =>
    queryClient.getQueryData<SessionInfo | null>(queryKeys.session(credentials.getToken()))?.user
      .id ?? null

  const seen = new Set<string>()
  const versions = new Map<string, number>()

  function isFresh(event: RealtimeEvent) {
    if (seen.has(event.id)) return false
    seen.add(event.id)
    if (seen.size > MAX_SEEN_EVENTS) seen.delete(seen.values().next().value!)

    const key = `${event.resource.type}:${event.resource.id}`
    if (event.version <= (versions.get(key) ?? 0)) return false
    versions.set(key, event.version)
    return true
  }

  function patchSummary(nft: NftSummary, event: NftUpdatedEvent): NftSummary {
    if (nft.id !== event.resource.id || nft.version >= event.version) return nft
    return {
      ...nft,
      price: event.data.price,
      previousPrice: event.data.previousPrice,
      available: event.data.available,
      version: event.version,
    }
  }

  function onNftUpdated(event: NftUpdatedEvent) {
    const nftId = event.resource.id
    const patch = (nft: NftSummary) => patchSummary(nft, event)

    queryClient.setQueriesData<NftListResponse>({ queryKey: queryKeys.nfts.lists() }, (data) =>
      data ? { ...data, items: data.items.map(patch) } : data,
    )
    queryClient.setQueriesData<{ items: NftSummary[] }>(
      { queryKey: ['nfts', 'related'] },
      (data) => (data ? { items: data.items.map(patch) } : data),
    )
    queryClient.setQueryData<HighlightsResponse>(queryKeys.nfts.highlights(), (data) =>
      data
        ? {
            hero: data.hero.map(patch),
            spotlight: data.spotlight && { ...data.spotlight, nft: patch(data.spotlight.nft) },
          }
        : data,
    )
    queryClient.setQueryData<NftDetail>(queryKeys.nfts.detail(nftId), (data) => {
      if (!data || data.version >= event.version) return data
      return {
        ...data,
        ...patch(data),
        editions: data.editions.map((edition) => {
          const update = event.data.editions.find((item) => item.id === edition.id)
          return update ? { ...edition, price: update.price, available: update.available } : edition
        }),
      }
    })

    const userId = getUserId()
    if (userId) {
      queryClient.setQueryData<FavoritesResponse>(queryKeys.private.favorites(userId), (data) =>
        data ? { items: data.items.map((item) => ({ ...item, nft: patch(item.nft) })) } : data,
      )
    }

    // Lists sorted/filtered by price may now be out of order: refresh them on next use.
    void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.lists(), refetchType: 'none' })

    // The cart total is computed by the server: refetch it and tell the collector.
    const key = cartKey(userId)
    const line = queryClient.getQueryData<Cart>(key)?.items.find((item) => item.nftId === nftId)
    if (line) {
      void queryClient.invalidateQueries({ queryKey: key })
      const edition = event.data.editions.find((item) => item.id === line.edition)
      if (edition && edition.available < line.quantity) {
        toast.warning(
          edition.available === 0
            ? `${line.name}: a edição ${line.editionLabel} esgotou.`
            : `${line.name}: restam apenas ${edition.available} unidade${edition.available === 1 ? '' : 's'} da edição ${line.editionLabel}.`,
          { id: `nft-${nftId}` },
        )
      } else if (edition && edition.price !== line.unitPrice) {
        toast.info(
          `O preço de ${line.name} (${line.editionLabel}) mudou de ${formatEth(line.unitPrice)} para ${formatEth(edition.price)} ETH. O resumo foi atualizado.`,
          { id: `nft-${nftId}` },
        )
      }
    }
  }

  function onOrderUpdated(event: OrderUpdatedEvent) {
    const userId = getUserId()
    // Events from another (or a previous) session never touch this user's data.
    if (!userId || event.userId !== userId) return

    const key = queryKeys.private.order(userId, event.resource.id)
    const previous = queryClient.getQueryData<Order>(key)
    if (previous && (previous.version >= event.version || isTerminalOrderStatus(previous.status)))
      return

    if (previous) {
      queryClient.setQueryData<Order>(key, {
        ...previous,
        status: event.data.status,
        statusReason: event.data.statusReason,
        transaction: event.data.transaction,
        version: event.version,
        updatedAt: event.occurredAt,
        settledAt: isTerminalOrderStatus(event.data.status) ? event.occurredAt : previous.settledAt,
      })
    }
    // Snapshot fields (lines, totals) come from REST: refetch to stay authoritative.
    void queryClient.invalidateQueries({ queryKey: key })
    void queryClient.invalidateQueries({ queryKey: ['private', userId, 'orders', 'list'] })

    if (isTerminalOrderStatus(event.data.status)) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.private.cart(userId) })
      if (event.data.status === 'confirmed') {
        toast.success('Pagamento confirmado na rede. Seu recibo está pronto.', {
          id: `order-${event.resource.id}`,
        })
      } else {
        toast.error('Pagamento recusado. Seus itens continuam no carrinho.', {
          id: `order-${event.resource.id}`,
        })
      }
    }
  }

  return {
    handle(event: RealtimeEvent) {
      if (!isFresh(event)) return
      if (event.type === 'nft.updated') onNftUpdated(event)
      else onOrderUpdated(event)
    },
  }
}

/** After a reconnection, REST is the source of truth for everything on screen. */
export function reconcileWithRest(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.guestCart() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.private.all })
}
