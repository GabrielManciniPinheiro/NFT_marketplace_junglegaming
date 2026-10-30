import type { Page } from '@playwright/test'
import { cartCount, expect, login, test } from './support/fixtures'

const line = (page: Page, name: string) =>
  page.locator('section[aria-labelledby=cart-items-title] li').filter({ hasText: name })
const total = (page: Page) =>
  page
    .locator('aside dl div')
    .filter({ hasText: /^Total/ })
    .locator('dd')

test.describe('Carrinho', () => {
  test('quantidades, limite, remoção, cupom e persistência @main', async ({ page }) => {
    await login(page, 'nova')
    await page.goto('/carrinho')
    await expect(total(page)).toHaveText('26.846 ETH')

    const ivory = line(page, 'Ivory Baron #088')
    await ivory.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(ivory.getByRole('spinbutton')).toHaveValue('10')
    await expect(ivory.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
    await expect(total(page)).toHaveText('28.636 ETH')

    await page.getByLabel('Código promocional').fill('nao-existe')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(
      page.getByText('Cupom inválido. Confira o código e tente novamente.'),
    ).toBeVisible()
    await page.getByLabel('Código promocional').fill('EXPIRADO20')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('O cupom EXPIRADO20 expirou em 30/11/2025.')).toBeVisible()
    await page.getByLabel('Código promocional').fill('kurio10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(total(page)).toHaveText('25.774 ETH')

    await line(page, 'Violet Nomad #314')
      .getByRole('button', { name: /Remover Violet Nomad/ })
      .click()
    await expect(line(page, 'Violet Nomad #314')).toHaveCount(0)
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(line(page, 'Violet Nomad #314')).toBeVisible()
    await line(page, 'Violet Nomad #314')
      .getByRole('button', { name: /Remover Violet Nomad/ })
      .click()
    await expect(line(page, 'Violet Nomad #314')).toHaveCount(0)

    await page.reload()
    await expect(line(page, 'Violet Nomad #314')).toHaveCount(0)
    await expect(page.getByText('KURIO10', { exact: true })).toBeVisible()
    await expect.poll(() => cartCount(page)).toBe(12)
    // 2 × 1.19 + 10 × 1.79 = 20.28; −10% = 18.252; + 0.016 fee
    await expect(total(page)).toHaveText('18.268 ETH')

    await page.getByRole('button', { name: /Remover cupom KURIO10/ }).click()
    await expect(total(page)).toHaveText('20.296 ETH')
  })

  test('carrinho vazio orienta a explorar o mercado', async ({ page }) => {
    await page.goto('/carrinho')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
    await page.getByRole('link', { name: 'Explorar o mercado' }).click()
    await expect(page).toHaveURL(/\/mercado$/)
  })

  test('visitante é levado ao login ao finalizar e volta ao pagamento', async ({ page }) => {
    await page.goto('/nft/golden-signal-160')
    await page.getByRole('button', { name: 'Comprar' }).click()
    await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpagamento/)
    await page.getByLabel('E-mail').fill('bruno@kurio.test')
    await page.getByLabel('Senha', { exact: true }).fill('Kurio@2026')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/pagamento$/)
    // exact: the "added to cart" toast may still be on screen and mentions the same name.
    await expect(page.getByText('Golden Signal #160', { exact: true })).toBeVisible()
  })
})
