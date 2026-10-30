import type { NftListQuery, OrderStatus } from './contracts'

/**
 * Query key factory.
 *
 * Every per-user resource lives under `['private', userId, ...]`, so data is isolated by
 * user and logout/user switch can drop all of it with a single `removeQueries`.
 */
export const queryKeys = {
  session: (token: string | null) => ['session', token] as const,

  nfts: {
    all: ['nfts'] as const,
    lists: () => ['nfts', 'list'] as const,
    list: (query: NftListQuery) => ['nfts', 'list', query] as const,
    highlights: () => ['nfts', 'highlights'] as const,
    detail: (nftId: string) => ['nfts', 'detail', nftId] as const,
    related: (nftId: string) => ['nfts', 'related', nftId] as const,
  },

  guestCart: () => ['cart', 'guest'] as const,

  private: {
    all: ['private'] as const,
    user: (userId: string) => ['private', userId] as const,
    cart: (userId: string) => ['private', userId, 'cart'] as const,
    favorites: (userId: string) => ['private', userId, 'favorites'] as const,
    profile: (userId: string) => ['private', userId, 'profile'] as const,
    wallets: (userId: string) => ['private', userId, 'wallets'] as const,
    orders: (userId: string, status?: OrderStatus) =>
      ['private', userId, 'orders', 'list', status ?? 'all'] as const,
    order: (userId: string, orderId: string) => ['private', userId, 'orders', orderId] as const,
  },
}

export const cartKey = (userId: string | null) =>
  userId ? queryKeys.private.cart(userId) : queryKeys.guestCart()
