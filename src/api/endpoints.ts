import {
  authResponseSchema,
  cartSchema,
  favoriteSchema,
  favoritesResponseSchema,
  highlightsResponseSchema,
  nftDetailSchema,
  nftListResponseSchema,
  orderSchema,
  ordersResponseSchema,
  profileSchema,
  quoteSchema,
  relatedResponseSchema,
  sessionInfoSchema,
  walletSchema,
  walletSessionSchema,
  walletsResponseSchema,
  type AddCartItemRequest,
  type ChangePasswordRequest,
  type ConnectWalletRequest,
  type CreateOrderRequest,
  type CreateQuoteRequest,
  type CreateWalletRequest,
  type LoginRequest,
  type NftListQuery,
  type OrderStatus,
  type RegisterRequest,
  type UpdateCartItemRequest,
  type UpdateProfileRequest,
  type WalletInput,
} from './contracts'
import { request, requestVoid, toSearchParams } from './http'

type Signal = AbortSignal | undefined
const id = (value: string) => encodeURIComponent(value)

/* ─── Session & account ───────────────────────────────────────────────────── */

export const authApi = {
  session: (signal?: Signal) => request(sessionInfoSchema, { url: '/auth/session', signal }),
  login: (body: LoginRequest) =>
    request(authResponseSchema, { url: '/auth/login', method: 'POST', data: body }),
  register: (body: RegisterRequest) =>
    request(authResponseSchema, { url: '/auth/register', method: 'POST', data: body }),
  logout: () => requestVoid({ url: '/auth/logout', method: 'POST' }),
}

export const profileApi = {
  get: (signal?: Signal) => request(profileSchema, { url: '/profile', signal }),
  update: (body: UpdateProfileRequest) =>
    request(profileSchema, { url: '/profile', method: 'PATCH', data: body }),
  uploadAvatar: (file: Blob, fileName: string) => {
    const form = new FormData()
    form.append('avatar', file, fileName)
    return request(profileSchema, { url: '/profile/avatar', method: 'PUT', data: form })
  },
  removeAvatar: () => request(profileSchema, { url: '/profile/avatar', method: 'DELETE' }),
  changePassword: (body: ChangePasswordRequest) =>
    requestVoid({ url: '/profile/password', method: 'POST', data: body }),
}

export const walletsApi = {
  list: (signal?: Signal) => request(walletsResponseSchema, { url: '/wallets', signal }),
  create: (body: CreateWalletRequest) =>
    request(walletSchema, { url: '/wallets', method: 'POST', data: body }),
  update: (walletId: string, body: WalletInput) =>
    request(walletSchema, { url: `/wallets/${id(walletId)}`, method: 'PUT', data: body }),
  remove: (walletId: string) => requestVoid({ url: `/wallets/${id(walletId)}`, method: 'DELETE' }),
  connect: (body: ConnectWalletRequest) =>
    request(walletSessionSchema, {
      url: '/wallet-sessions',
      method: 'POST',
      data: body,
      timeoutMs: 20_000,
    }),
  disconnect: (sessionId: string) =>
    requestVoid({ url: `/wallet-sessions/${id(sessionId)}`, method: 'DELETE' }),
}

/* ─── Catalog ─────────────────────────────────────────────────────────────── */

export const nftsApi = {
  list: (query: NftListQuery, signal?: Signal) =>
    request(nftListResponseSchema, { url: '/nfts', params: toSearchParams(query), signal }),
  highlights: (signal?: Signal) =>
    request(highlightsResponseSchema, { url: '/nfts/highlights', signal }),
  detail: (nftId: string, signal?: Signal) =>
    request(nftDetailSchema, { url: `/nfts/${id(nftId)}`, signal }),
  related: (nftId: string, signal?: Signal) =>
    request(relatedResponseSchema, { url: `/nfts/${id(nftId)}/related`, signal }),
}

export const favoritesApi = {
  list: (signal?: Signal) => request(favoritesResponseSchema, { url: '/favorites', signal }),
  add: (nftId: string) =>
    request(favoriteSchema, { url: `/favorites/${id(nftId)}`, method: 'PUT' }),
  remove: (nftId: string) => requestVoid({ url: `/favorites/${id(nftId)}`, method: 'DELETE' }),
}

/* ─── Cart, quote & orders ────────────────────────────────────────────────── */

export const cartApi = {
  get: (signal?: Signal) => request(cartSchema, { url: '/cart', signal }),
  addItem: (body: AddCartItemRequest) =>
    request(cartSchema, { url: '/cart/items', method: 'POST', data: body }),
  updateItem: (itemId: string, body: UpdateCartItemRequest) =>
    request(cartSchema, { url: `/cart/items/${id(itemId)}`, method: 'PATCH', data: body }),
  removeItem: (itemId: string) =>
    request(cartSchema, { url: `/cart/items/${id(itemId)}`, method: 'DELETE' }),
  applyCoupon: (code: string) =>
    request(cartSchema, { url: '/cart/coupon', method: 'PUT', data: { code } }),
  removeCoupon: () => request(cartSchema, { url: '/cart/coupon', method: 'DELETE' }),
}

export const checkoutApi = {
  quote: (body: CreateQuoteRequest) =>
    request(quoteSchema, { url: '/quotes', method: 'POST', data: body }),
  createOrder: (body: CreateOrderRequest, idempotencyKey: string) =>
    request(orderSchema, {
      url: '/orders',
      method: 'POST',
      data: body,
      headers: { 'Idempotency-Key': idempotencyKey },
      timeoutMs: 8_000,
    }),
  order: (orderId: string, signal?: Signal) =>
    request(orderSchema, { url: `/orders/${id(orderId)}`, signal }),
  orders: (status: OrderStatus | undefined, signal?: Signal) =>
    request(ordersResponseSchema, { url: '/orders', params: toSearchParams({ status }), signal }),
}
