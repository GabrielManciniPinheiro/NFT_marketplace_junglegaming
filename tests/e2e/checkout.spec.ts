import type { Page } from '@playwright/test'
import { cartCount, expect, login, test } from './support/fixtures'

const review = (page: Page) => page.getByRole('dialog', { name: 'Revise seu pedido' })

async function openReview(page: Page) {
  await page.goto('/pagamento')
  await expect(page.locator('#collector-referralCode')).toHaveValue('NOVA01')
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(review(page).getByRole('button', { name: /Conectar e pagar|^Pagar/ })).toBeEnabled()
}

test.describe('Compra', () => {
  test('do catálogo ao recibo confirmado @main', async ({ page, mock }) => {
    await mock.preset('fast', { settlementDelayMs: 0 })
    await login(page, 'bruno')
    await page.goto('/')
    await page.getByRole('link', { name: 'Golden Beat #207' }).first().click()
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await page.getByRole('button', { name: 'Comprar' }).click()
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()

    await expect(page.locator('#collector-referralCode')).toHaveValue('BRUNO01')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    const dialog = review(page)
    await expect(dialog.getByText('Golden Beat #207')).toBeVisible()
    await expect(
      dialog
        .locator('dl div')
        .filter({ hasText: /^Total/ })
        .locator('dd'),
    ).toHaveText('1.996 ETH')
    await dialog.getByRole('button', { name: /Conectar e pagar 1\.996 ETH/ }).click()

    // pending until the simulated chain settles: no receipt yet
    await expect(
      page.getByRole('heading', { name: 'Aguardando confirmação da rede' }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toHaveCount(0)
    await mock.settlePending('confirm')

    await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible()
    await expect(page.getByText(/^0x[0-9a-f]{64}$/)).toBeVisible()
    await expect(page.getByRole('cell', { name: /Golden Beat #207/ })).toBeVisible()
    await expect.poll(() => cartCount(page)).toBe(0)
    expect(await mock.orders()).toEqual([
      expect.objectContaining({ status: 'confirmed', total: '1.996' }),
    ])
  })

  test('pagamento recusado preserva os itens no carrinho @main', async ({ page, mock }) => {
    await mock.preset('payment-declined', { settlementDelayMs: 0 })
    await login(page, 'nova')
    await openReview(page)
    await review(page)
      .getByRole('button', { name: /Conectar e pagar/ })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Aguardando confirmação da rede' }),
    ).toBeVisible()
    await mock.settlePending('decline')
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
    await expect(
      page.getByText('Nada foi cobrado e seus itens continuam no carrinho.'),
    ).toBeVisible()
    await expect.poll(() => cartCount(page)).toBe(17)
  })

  test('clique repetido cria um único pedido', async ({ page, mock }) => {
    await mock.preset('fast', { settlementDelayMs: 0 })
    await login(page, 'nova')
    await openReview(page)
    await review(page)
      .getByRole('button', { name: /Conectar e pagar/ })
      .dblclick()
    await expect(page).toHaveURL(/\/pedidos\//)
    expect(await mock.orders()).toHaveLength(1)
  })

  test('timeout após criar o pedido recupera o mesmo pedido', async ({ page, mock }) => {
    await mock.preset('order-timeout', { settlementDelayMs: 0 })
    await page.clock.install()
    await login(page, 'nova')
    await openReview(page)
    await review(page)
      .getByRole('button', { name: /Conectar e pagar/ })
      .click()
    await expect(review(page).getByRole('button', { name: 'Enviando pedido…' })).toBeVisible()

    // the server created the order but answers after the 8 s client deadline
    await expect.poll(() => mock.orders()).toHaveLength(1)
    await page.clock.fastForward(8_500)
    await expect(review(page).getByRole('alert')).toContainText('não haverá compra duplicada')

    await review(page).getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page).toHaveURL(/\/pedidos\//)
    const orders = await mock.orders()
    expect(orders).toHaveLength(1)
    await expect(page.getByText(orders[0]!.number, { exact: true })).toBeVisible()
  })

  test('carteira recusa a conexão e o usuário tenta de novo', async ({ page, mock }) => {
    await mock.preset('wallet-rejected', { settlementDelayMs: 0 })
    await login(page, 'nova')
    await openReview(page)
    await review(page)
      .getByRole('button', { name: /Conectar e pagar/ })
      .click()
    await expect(review(page).getByRole('alert')).toContainText(
      'A conexão foi recusada na carteira',
    )
    expect(await mock.orders()).toHaveLength(0)

    await mock.setConfig({ walletApproval: 'approve' })
    await review(page).getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page).toHaveURL(/\/pedidos\//)
  })

  test('mudança de preço na confirmação exige aceitar os novos valores', async ({ page, mock }) => {
    await mock.preset('checkout-price-change', { settlementDelayMs: 0 })
    await login(page, 'nova')
    await openReview(page)
    await review(page)
      .getByRole('button', { name: /Conectar e pagar/ })
      .click()
    await expect(review(page).getByText('Os valores do pedido mudaram:')).toBeVisible()
    await expect(
      review(page).getByText(/Emerald Ape #042 \(1\/50\) mudou de 1\.19 para 1\.309 ETH/),
    ).toBeVisible()
    expect(await mock.orders()).toHaveLength(0)

    await review(page).getByRole('button', { name: 'Aceitar novos valores' }).click()
    await review(page)
      .getByRole('button', { name: /^Pagar 27\.084 ETH/ })
      .click()
    await expect(page).toHaveURL(/\/pedidos\//)
    expect(await mock.orders()).toEqual([expect.objectContaining({ total: '27.084' })])
  })

  test('validação dos campos do colecionador e erro da API no campo', async ({ page }) => {
    await login(page, 'nova')
    await page.goto('/pagamento')
    await expect(page.locator('#collector-referralCode')).toHaveValue('NOVA01')
    await page.getByLabel('Endereço da carteira').fill('0x123')
    await page.getByLabel('E-mail').fill('invalido')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByLabel('Endereço da carteira')).toBeFocused()
    await expect(page.getByText('Use 0x seguido de 40 caracteres hexadecimais')).toBeVisible()
    await expect(page.getByText('Informe um e-mail válido')).toBeVisible()
    await expect(review(page)).toHaveCount(0)

    await page.getByLabel('Endereço da carteira').fill('0xA91F3c7d5b2e8f104a6c9d2b7e5f1a3c8d6bE82C')
    await page.getByLabel('E-mail').fill('nova@kurio.test')
    await page.getByLabel('Código de indicação').fill('ZZZZ99')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await review(page)
      .getByRole('button', { name: /Conectar e pagar/ })
      .click()
    await expect(review(page)).toHaveCount(0)
    await expect(page.getByText('Código de indicação não encontrado.')).toBeVisible()
  })
})
