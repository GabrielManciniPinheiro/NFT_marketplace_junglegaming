import { expect, login, test } from './support/fixtures'

test.describe('Favoritos', () => {
  test('persistem para o usuário autenticado', async ({ page }) => {
    await login(page, 'bruno')
    await page.goto('/nft/neon-vessel-552')
    const favorite = page.getByRole('button', { name: /Favoritar|Favoritado/ })
    await expect(favorite).toHaveAttribute('aria-pressed', 'false')
    await favorite.click()
    await expect(favorite).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Favoritado' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.goto('/perfil/favoritos')
    await expect(page.getByRole('link', { name: 'Neon Vessel #552' })).toBeVisible()
  })

  test('falha da mutation faz rollback e o estado se recupera', async ({ page, mock }) => {
    await login(page, 'bruno')
    await page.goto('/nft/neon-vessel-552')
    const favorite = page.getByRole('button', { name: /Favoritar|Favoritado/ })
    await expect(favorite).toHaveAttribute('aria-pressed', 'false')

    await mock.setConfig({
      favoritesFailure: true,
      latency: { mode: 'fixed', baseMs: 600, jitterMs: 0 },
    })
    await favorite.click()
    await expect(favorite).toHaveAttribute('aria-pressed', 'true') // optimistic
    await expect(page.getByText(/Não foi possível favoritar/)).toBeVisible()
    await expect(favorite).toHaveAttribute('aria-pressed', 'false') // rolled back

    await mock.setConfig({
      favoritesFailure: false,
      latency: { mode: 'none', baseMs: 0, jitterMs: 0 },
    })
    await favorite.click()
    await expect(favorite).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Favoritado' })).toBeVisible()
  })

  test('visitante é levado ao login ao favoritar', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await page.getByRole('button', { name: 'Favoritar' }).click()
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fnft%2Femerald-ape-042/)
  })
})
