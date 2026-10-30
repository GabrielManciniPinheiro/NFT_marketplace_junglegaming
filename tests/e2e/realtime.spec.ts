import type { Page } from '@playwright/test'
import { expect, login, test, type MockApi } from './support/fixtures'

const review = (page: Page) => page.getByRole('dialog', { name: 'Revise seu pedido' })
const summaryTotal = (page: Page) =>
  page
    .locator('aside dl div')
    .filter({ hasText: /^Total/ })
    .locator('dd')
    .first()

async function waitForSocket(_page: Page, mock: MockApi, authenticated = 1) {
  await expect
    .poll(async () => (await mock.realtimeConnections()).authenticated)
    .toBeGreaterThanOrEqual(authenticated)
}

test.describe('Tempo real (Socket.IO)', () => {
  test('preço muda com o item no carrinho e o checkout bloqueia a cotação desatualizada @main', async ({
    page,
    mock,
  }) => {
    await login(page, 'nova')
    await page.goto('/carrinho')
    await expect(summaryTotal(page)).toHaveText('26.846 ETH')
    await waitForSocket(page, mock)

    // 1–3: the item is in the cart, its price changes, the UI informs and updates the summary
    await mock.changePrice('emerald-ape-042', 10)
    await expect(
      page.getByText(
        'O preço de Emerald Ape #042 (1/50) mudou de 1.19 para 1.309 ETH. O resumo foi atualizado.',
      ),
    ).toBeVisible()
    await expect(page.getByText('Preço atualizado: 1.19 → 1.309 ETH.')).toBeVisible()
    await expect(summaryTotal(page)).toHaveText('27.084 ETH')

    // 4: a quote taken before another change can no longer be confirmed
    await page.goto('/pagamento')
    await expect(page.locator('#collector-referralCode')).toHaveValue('NOVA01')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(
      review(page).getByRole('button', { name: /Conectar e pagar 27\.084 ETH/ }),
    ).toBeEnabled()
    await mock.changePrice('ivory-baron-088', 10)
    await expect(
      review(page).getByText('Os preços ou a disponibilidade mudaram enquanto você revisava.'),
    ).toBeVisible()
    await expect(review(page).getByRole('button', { name: /Conectar e pagar/ })).toHaveCount(0)
    await review(page).getByRole('button', { name: 'Atualizar cotação' }).click()
    // Ivory Baron 1.79 → 1.969 × 9 = 17.721
    await expect(
      review(page).getByRole('button', { name: /Conectar e pagar 28\.695 ETH/ }),
    ).toBeEnabled()
    expect(await mock.orders()).toHaveLength(0)
  })

  test('edição esgota durante o checkout', async ({ page, mock }) => {
    await login(page, 'nova')
    await page.goto('/pagamento')
    await waitForSocket(page, mock)
    await mock.sellOut('violet-nomad-314')
    await expect(page.getByText('Violet Nomad #314: a edição 1/50 esgotou.')).toBeVisible()
    await expect(page.getByText('Há itens indisponíveis no carrinho.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
  })

  test('eventos duplicados ou antigos não regridem o estado', async ({ page, mock }) => {
    await page.goto('/nft/emerald-ape-042')
    const price = page
      .getByRole('heading', { level: 1 })
      .locator('xpath=following-sibling::div[1]')
      .locator('.text-brand')
      .first()
    await expect(price).toHaveText(/1\.19 ETH/)
    await expect.poll(async () => (await mock.realtimeConnections()).connections).toBeGreaterThan(0)

    await mock.changePrice('emerald-ape-042', 10) // v2 → 1.309
    await expect(price).toHaveText(/1\.309 ETH/)
    await mock.replayLastEvent() // same event id again
    await mock.emitStaleNftEvent('emerald-ape-042') // new id, older version, half price
    await page.waitForTimeout(500)
    await expect(price).toHaveText(/1\.309 ETH/)
    await expect(page.getByText(/0\.6545/)).toHaveCount(0)
  })

  test('queda da conexão com pedido pendente, refresh e retomada sem nova compra', async ({
    page,
    mock,
  }) => {
    await mock.preset('fast', { settlementDelayMs: 0 })
    await login(page, 'nova')
    await page.goto('/pagamento')
    await expect(page.locator('#collector-referralCode')).toHaveValue('NOVA01')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await review(page)
      .getByRole('button', { name: /Conectar e pagar/ })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Aguardando confirmação da rede' }),
    ).toBeVisible()

    await page.reload()
    await expect(
      page.getByRole('heading', { name: 'Aguardando confirmação da rede' }),
    ).toBeVisible()
    await waitForSocket(page, mock)

    await mock.dropRealtime(4_000)
    await expect(page.getByText(/Atualizações em tempo real indisponíveis/)).toBeVisible()
    await mock.settlePending('confirm') // happens while the client is offline: the event is lost
    await expect(
      page.getByRole('heading', { name: 'Aguardando confirmação da rede' }),
    ).toBeVisible()

    // after reconnecting, the client reconciles with REST
    await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.getByText('Conexão em tempo real restabelecida. Dados sincronizados.'),
    ).toBeVisible()
    expect(await mock.orders()).toEqual([expect.objectContaining({ status: 'confirmed' })])

    // the checkout does not offer a second purchase of the same items
    await page.goto('/pagamento')
    await expect(page.getByText('Não há itens para pagar')).toBeVisible()
  })

  test('evento de pedido da sessão anterior não alcança o novo usuário', async ({ page, mock }) => {
    await mock.preset('fast', { settlementDelayMs: 0 })
    await login(page, 'nova')
    await page.goto('/pagamento')
    await expect(page.locator('#collector-referralCode')).toHaveValue('NOVA01')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await review(page)
      .getByRole('button', { name: /Conectar e pagar/ })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Aguardando confirmação da rede' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Conta de Nova Ribeiro' }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await login(page, 'bruno')
    await waitForSocket(page, mock)

    await mock.settlePending('confirm') // order.updated addressed to Nova
    await page.waitForTimeout(800)
    await expect(
      page.getByText('Pagamento confirmado na rede. Seu recibo está pronto.'),
    ).toHaveCount(0)
    await page.goto('/carrinho')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })
})
