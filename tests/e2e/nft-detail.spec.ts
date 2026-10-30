import { cartCount, expect, test } from './support/fixtures'

test.describe('Detalhe do NFT', () => {
  test('acesso direto, galeria, edição e compra @main', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByText('19 avaliações de colecionadores')).toBeVisible()
    await expect(page.getByRole('radio', { name: '1/50', exact: true })).toBeChecked()

    await page.getByRole('button', { name: /Ver imagem 2 de 4/ }).click()
    await expect(page.getByRole('button', { name: /Ver imagem 2 de 4/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await page.getByRole('button', { name: 'Comprar' }).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect.poll(() => cartCount(page)).toBe(2)
  })

  test('NFT inexistente mostra página dedicada', async ({ page }) => {
    await page.goto('/nft/nao-existe')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Explorar o mercado' }).click()
    await expect(page).toHaveURL(/\/mercado$/)
  })

  test('edição esgotada fica indisponível e quantidade respeita o limite', async ({ page }) => {
    await page.goto('/nft/sage-nomad-009')
    await expect(page.getByRole('radio', { name: '1/1 (esgotada)' })).toBeDisabled()

    await page
      .locator('fieldset label')
      .filter({ hasText: /^1\/10$/ })
      .click()
    await expect(page.getByRole('radio', { name: '1/10', exact: true })).toBeChecked()
    const plus = page.getByRole('button', { name: 'Aumentar quantidade' })
    for (let i = 0; i < 3; i++) if (await plus.isEnabled()) await plus.click()
    await expect(page.getByRole('spinbutton', { name: /Quantidade da edição 1\/10/ })).toHaveValue(
      '3',
    )
    await expect(plus).toBeDisabled()
    await expect(page.getByText(/máx\. 3 por pedido/)).toBeVisible()

    // typed values are clamped to the limit
    const input = page.getByRole('spinbutton', { name: /Quantidade da edição 1\/10/ })
    await input.fill('99')
    await input.press('Enter')
    await expect(input).toHaveValue('3')
  })
})
