import {
  addCartItemRequestSchema,
  applyCouponRequestSchema,
  updateCartItemRequestSchema,
} from '@/api/contracts'
import { store } from '../db/store'
import {
  cartView,
  couponForCode,
  emptyGuestCart,
  lineEdition,
  resolveCart,
  touch,
} from '../domain/commerce'
import { fail, json, readJson, route } from '../lib/http'

function availabilityError(
  name: string,
  label: string,
  requested: number,
  available: number,
  max: number,
) {
  const message =
    available === 0
      ? `A edição ${label} de ${name} está esgotada.`
      : `Você pode levar no máximo ${max} unidade${max === 1 ? '' : 's'} da edição ${label} de ${name}.`
  return fail(409, 'AVAILABILITY_CONFLICT', message, {
    fieldErrors: { quantity: [message] },
    details: { items: [{ name, requested, available }] },
  })
}

export const cartHandlers = [
  route('get', '/cart', 'optional', ({ auth, request }) => {
    const cart = resolveCart(auth?.user.id ?? null, request, { create: false })
    if (cart) store.commit() // account carts may have been created on first access
    return json(cartView(cart ?? emptyGuestCart()))
  }),

  route('post', '/cart/items', 'optional', async ({ auth, request }) => {
    const body = await readJson(request, addCartItemRequestSchema)
    const resolved = lineEdition(body.nftId, body.edition)
    if (!resolved) {
      if (!store.getNft(body.nftId)) throw fail(404, 'NOT_FOUND', 'NFT não encontrado.')
      throw fail(422, 'VALIDATION_FAILED', 'Edição indisponível para este NFT.', {
        fieldErrors: { edition: ['Edição indisponível'] },
      })
    }
    const { nft, edition } = resolved
    const cart = resolveCart(auth?.user.id ?? null, request)
    const existing = cart.lines.find(
      (line) => line.nftId === body.nftId && line.edition === body.edition,
    )
    const requested = (existing?.quantity ?? 0) + body.quantity
    const max = Math.min(edition.available, edition.maxPerOrder)
    if (requested > max) {
      throw availabilityError(nft.fixture.name, edition.label, requested, edition.available, max)
    }

    if (existing) {
      existing.quantity = requested
      existing.seenPrice = edition.price
    } else {
      cart.lines.push({
        id: store.nextId('line'),
        nftId: body.nftId,
        edition: body.edition,
        quantity: body.quantity,
        seenPrice: edition.price,
        addedAt: new Date().toISOString(),
      })
    }
    touch(cart)
    return json(cartView(cart), existing ? 200 : 201)
  }),

  route('patch', '/cart/items/:id', 'optional', async ({ auth, request, params }) => {
    const body = await readJson(request, updateCartItemRequestSchema)
    const cart = resolveCart(auth?.user.id ?? null, request)
    const line = cart.lines.find((item) => item.id === params.id)
    if (!line) throw fail(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')
    const resolved = lineEdition(line.nftId, line.edition)
    if (!resolved) throw fail(404, 'NOT_FOUND', 'NFT não encontrado.')
    const { nft, edition } = resolved

    if (body.quantity !== undefined && body.quantity !== line.quantity) {
      const max = Math.min(edition.available, edition.maxPerOrder)
      // Lowering the quantity is always allowed, even when the edition became scarce.
      if (body.quantity > line.quantity && body.quantity > max) {
        throw availabilityError(
          nft.fixture.name,
          edition.label,
          body.quantity,
          edition.available,
          max,
        )
      }
      line.quantity = body.quantity
    }
    if (body.acknowledgePrice) line.seenPrice = edition.price
    touch(cart)
    return json(cartView(cart))
  }),

  route('delete', '/cart/items/:id', 'optional', ({ auth, request, params }) => {
    const cart = resolveCart(auth?.user.id ?? null, request)
    const index = cart.lines.findIndex((item) => item.id === params.id)
    if (index < 0) throw fail(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')
    cart.lines.splice(index, 1)
    touch(cart)
    return json(cartView(cart))
  }),

  route('put', '/cart/coupon', 'optional', async ({ auth, request }) => {
    const body = await readJson(request, applyCouponRequestSchema)
    const cart = resolveCart(auth?.user.id ?? null, request)
    if (!cart.lines.length) {
      throw fail(
        422,
        'VALIDATION_FAILED',
        'Adicione itens ao carrinho antes de aplicar um cupom.',
        {
          fieldErrors: { code: ['Carrinho vazio'] },
        },
      )
    }
    cart.couponCode = couponForCode(body.code).code
    touch(cart)
    return json(cartView(cart))
  }),

  route('delete', '/cart/coupon', 'optional', ({ auth, request }) => {
    const cart = resolveCart(auth?.user.id ?? null, request)
    cart.couponCode = null
    touch(cart)
    return json(cartView(cart))
  }),
]
