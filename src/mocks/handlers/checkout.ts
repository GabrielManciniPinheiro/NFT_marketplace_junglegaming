import { delay } from 'msw'
import {
  connectWalletRequestSchema,
  createOrderRequestSchema,
  createQuoteRequestSchema,
  isValidAddress,
  orderStatusSchema,
} from '@/api/contracts'
import { eth } from '@/lib/eth'
import { mockConfig } from '../config'
import { store, type QuoteDto } from '../db/store'
import { REFERRAL_CODES } from '../fixtures/accounts'
import { updateNft } from '../domain/catalog'
import { buildQuote, createOrder, diffQuotes, settleOrder, userCart } from '../domain/commerce'
import { fail, json, noContent, readJson, route } from '../lib/http'
import { stableStringify } from '../lib/random'

/** Time the simulated wallet takes to "ask" the collector (skipped when latency is off). */
const walletPromptDelay = () => (mockConfig.get().latency.mode === 'none' ? 0 : 700)

function ownedOrder(orderId: string, userId: string) {
  const record = store.state.orders[orderId]
  if (!record) throw fail(404, 'NOT_FOUND', 'Pedido não encontrado.')
  if (record.order.userId !== userId) {
    throw fail(403, 'FORBIDDEN', 'Este pedido pertence a outra conta.')
  }
  // Lazy settlement: a pending order past its deadline settles on read (e.g. after a reload).
  if (
    record.order.status === 'pending' &&
    record.settleAt != null &&
    record.settleAt <= Date.now()
  ) {
    settleOrder(record.order.id)
  }
  return record.order
}

/** One-shot catalog change used by the "checkout-*" scenarios, published via nft.updated. */
function springCheckoutTrap(line: QuoteDto['lines'][number]) {
  const trap = mockConfig.get().checkoutTrap
  if (trap === 'none') return
  mockConfig.set({ checkoutTrap: 'none' })
  if (trap === 'price-change') {
    updateNft(line.nftId, { edition: line.edition, price: eth.bps(line.unitPrice, 11_000) })
  } else {
    updateNft(line.nftId, { edition: line.edition, available: 0 })
  }
}

export const checkoutHandlers = [
  route('post', '/quotes', 'required', async ({ auth, request }) => {
    const body = await readJson(request, createQuoteRequestSchema)
    const quote = buildQuote(userCart(auth.user.id), body.network, auth.user.id)
    return json(quote, 201)
  }),

  route('post', '/wallet-sessions', 'required', async ({ auth, request }) => {
    const body = await readJson(request, connectWalletRequestSchema)
    const wallet = store.state.wallets[body.walletId]
    if (!wallet) throw fail(404, 'NOT_FOUND', 'Carteira não encontrada.')
    if (wallet.userId !== auth.user.id)
      throw fail(403, 'FORBIDDEN', 'Esta carteira pertence a outra conta.')
    if (!isValidAddress(body.network, wallet.address)) {
      throw fail(
        422,
        'VALIDATION_FAILED',
        'O endereço desta carteira não é compatível com a rede selecionada.',
        {
          fieldErrors: { network: ['Rede incompatível com o endereço da carteira'] },
        },
      )
    }

    await delay(walletPromptDelay())
    if (mockConfig.get().walletApproval === 'reject') {
      throw fail(
        409,
        'WALLET_REJECTED',
        'A conexão foi recusada na carteira. Tente novamente ou escolha outra carteira.',
      )
    }

    const session = {
      id: store.nextId('wss'),
      userId: auth.user.id,
      walletId: wallet.id,
      provider: body.provider,
      network: body.network,
      address: wallet.address,
      connectedAt: new Date().toISOString(),
      disconnectedAt: null,
    }
    store.state.walletSessions[session.id] = session
    const { userId: _userId, disconnectedAt: _disconnectedAt, ...dto } = session
    return json(dto, 201)
  }),

  route('delete', '/wallet-sessions/:id', 'required', ({ auth, params }) => {
    const session = store.state.walletSessions[params.id!]
    if (session && session.userId === auth.user.id)
      session.disconnectedAt ??= new Date().toISOString()
    return noContent()
  }),

  route('post', '/orders', 'required', async ({ auth, request }) => {
    const key = request.headers.get('Idempotency-Key')?.trim()
    if (!key) throw fail(422, 'VALIDATION_FAILED', 'Cabeçalho Idempotency-Key obrigatório.')
    const body = await readJson(request, createOrderRequestSchema)
    const fingerprint = stableStringify(body)
    const scopedKey = `${auth.user.id}:${key}`

    // Same attempt → same order; same key with another payload → conflict.
    const previous = store.state.idempotency[scopedKey]
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        throw fail(
          409,
          'IDEMPOTENCY_CONFLICT',
          'Esta tentativa de compra já foi usada com outros dados.',
        )
      }
      return json(ownedOrder(previous.orderId, auth.user.id), 200, {
        'Idempotent-Replayed': 'true',
      })
    }

    // One purchase in flight per collector: a retry with a new key after a timeout must
    // recover the pending order instead of creating a second one.
    const pending = Object.values(store.state.orders).find(
      (record) => record.order.userId === auth.user.id && record.order.status === 'pending',
    )
    if (pending) {
      throw fail(409, 'CONFLICT', 'Você já tem um pedido em processamento.', {
        details: { reason: 'pending-order', orderId: pending.order.id },
      })
    }

    if (!REFERRAL_CODES.includes(body.collector.referralCode.trim().toUpperCase())) {
      throw fail(422, 'VALIDATION_FAILED', 'Revise os dados do colecionador.', {
        fieldErrors: { 'collector.referralCode': ['Código de indicação não encontrado.'] },
      })
    }

    const quoteRecord = store.state.quotes[body.quoteId]
    if (!quoteRecord)
      throw fail(404, 'NOT_FOUND', 'Cotação não encontrada. Revise o pedido novamente.')
    if (quoteRecord.userId !== auth.user.id)
      throw fail(403, 'FORBIDDEN', 'Esta cotação pertence a outra conta.')

    const walletSession = store.state.walletSessions[body.walletSessionId]
    const wallet = store.state.wallets[body.walletId]
    if (
      !walletSession ||
      !wallet ||
      walletSession.userId !== auth.user.id ||
      walletSession.disconnectedAt !== null ||
      walletSession.walletId !== body.walletId ||
      walletSession.provider !== body.provider ||
      walletSession.network !== body.network
    ) {
      throw fail(
        409,
        'CONFLICT',
        'A carteira foi desconectada. Conecte novamente para concluir a compra.',
        {
          details: { reason: 'wallet-disconnected' },
        },
      )
    }

    const stored = quoteRecord.quote
    springCheckoutTrap(stored.lines[0]!)

    // Revalidate price, availability, coupon and fees against the current state.
    const fresh = buildQuote(userCart(auth.user.id), body.network, auth.user.id)
    const changes = diffQuotes(stored, fresh, Date.parse(stored.expiresAt) <= Date.now())
    if (changes.length) {
      throw fail(
        409,
        'QUOTE_CHANGED',
        'Os valores do pedido mudaram. Revise e confirme novamente.',
        {
          details: { quote: fresh, changes },
        },
      )
    }
    delete store.state.quotes[fresh.id]

    const record = createOrder({
      userId: auth.user.id,
      quote: stored,
      wallet,
      provider: body.provider,
      network: body.network,
      collector: body.collector,
    })
    store.state.idempotency[scopedKey] = {
      userId: auth.user.id,
      key,
      fingerprint,
      orderId: record.order.id,
      createdAt: record.order.createdAt,
    }
    store.commit()

    if (mockConfig.get().orderTimeout) {
      // The order exists, but the answer arrives after the client deadline.
      mockConfig.set({ orderTimeout: false })
      await delay(30_000)
    }
    return json(record.order, 201)
  }),

  route('get', '/orders', 'required', ({ auth, url }) => {
    const status = orderStatusSchema.safeParse(url.searchParams.get('status'))
    const items = Object.values(store.state.orders)
      .filter((record) => record.order.userId === auth.user.id)
      .map((record) => ownedOrder(record.order.id, auth.user.id))
      .filter((order) => !status.success || order.status === status.data)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return json({ items })
  }),

  route('get', '/orders/:id', 'required', ({ auth, params }) => {
    const order = ownedOrder(params.id!, auth.user.id)
    store.commit()
    return json(order)
  }),
]
