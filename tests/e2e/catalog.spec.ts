import type { Page } from '@playwright/test'
import { expect, isMobile, test } from './support/fixtures'

const results = (page: Page) => page.getByRole('status').filter({ hasText: /encontrad/ })
const cards = (page: Page) => page.locator('#catalogo article')
/** Clicks the visible facet row, as a person would (the checkbox itself is visually hidden). */
const toggleFacet = (page: Page, label: string) =>
  page
    .locator('fieldset label')
    .filter({ visible: true })
    .filter({ hasText: new RegExp(`^${label}`) })
    .first()
    .click()

async function openFilters(page: Page) {
  if (isMobile(page)) await page.getByRole('button', { name: /^Filtros/ }).click()
}
async function closeFilters(page: Page) {
  if (isMobile(page)) await page.getByRole('button', { name: /^Ver \d+ resultados/ }).click()
}

test.describe('Catálogo', () => {
  test('busca, filtros combinados, ordenação, paginação e histórico @main', async ({ page }) => {
    await page.goto('/mercado')
    await expect(results(page)).toHaveText('120 NFTs encontrados')

    await openFilters(page)
    await toggleFacet(page, 'Música')
    await expect(page).toHaveURL(/category=musica/)
    await expect(results(page)).toHaveText('38 NFTs encontrados')

    await toggleFacet(page, 'Polygon')
    await expect(page).toHaveURL(/category=musica&network=polygon/)
    await expect(results(page)).toHaveText('11 NFTs encontrados')
    await closeFilters(page)

    await page.getByLabel('Ordenar por:').click()
    await page.getByRole('option', { name: 'Menor preço' }).click()
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(cards(page).first()).toContainText('Cosmic Pulse #261')

    // removing a filter goes back to page 1 and widens the result
    await page.getByRole('button', { name: /^Polygon \(remover filtro\)/ }).click()
    await expect(results(page)).toHaveText('38 NFTs encontrados')
    await page.getByRole('link', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    const firstOnPage2 = await cards(page).first().locator('h3').textContent()

    await page.goBack()
    await expect(page).not.toHaveURL(/page=2/)
    await expect(cards(page).first()).not.toHaveText(firstOnPage2 ?? '')
    await page.goForward()
    await expect(page).toHaveURL(/page=2/)
    await expect(cards(page).first().locator('h3')).toHaveText(firstOnPage2 ?? '')

    await page.reload()
    await expect(results(page)).toHaveText('38 NFTs encontrados')
    await expect(cards(page).first().locator('h3')).toHaveText(firstOnPage2 ?? '')
  })

  test('busca pelo header e resultado vazio', async ({ page }) => {
    await page.goto('/mercado')
    await page.getByRole('button', { name: 'Buscar NFTs' }).click()
    await page.getByRole('searchbox', { name: 'Termo de busca' }).fill('nomad')
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    await expect(page).toHaveURL(/q=nomad/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Resultados para “nomad”')
    await expect(cards(page).first()).toContainText(/Nomad|Bloom/)

    await page.goto('/mercado?q=nao-existe-nenhum')
    await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(results(page)).toHaveText('120 NFTs encontrados')
  })

  test('catálogo vazio exibe estado vazio', async ({ page, mock }) => {
    await mock.preset('empty')
    await page.goto('/mercado')
    await expect(page.getByText('Nenhum NFT disponível no momento')).toBeVisible()
  })

  test('skeletons na rede lenta e conteúdo sem deslocamento', async ({ page, mock }) => {
    await mock.preset('slow')
    await page.goto('/mercado')
    const loading = page.getByRole('list', { name: 'Carregando NFTs' })
    await expect(loading).toBeVisible()
    await expect(loading.locator('[data-slot=skeleton]').first()).toBeVisible()
    await expect(cards(page).first()).toBeVisible({ timeout: 15_000 })
    await expect(loading).toHaveCount(0)
  })

  test('falha transitória mostra erro e recupera com nova tentativa', async ({ page, mock }) => {
    await mock.preset('flaky')
    await page.goto('/mercado')
    // 3 failures exhaust the automatic retries (2); the 4th, manual, succeeds
    const error = page
      .getByRole('alert')
      .filter({ hasText: 'Não foi possível carregar o catálogo' })
    await expect(error).toBeVisible({ timeout: 15_000 })
    await expect(error).toContainText('Serviço temporariamente indisponível')
    await error.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(cards(page).first()).toBeVisible()
  })

  test('respostas fora de ordem não sobrescrevem a consulta mais recente', async ({
    page,
    mock,
  }) => {
    await page.goto('/mercado')
    await expect(results(page)).toHaveText('120 NFTs encontrados')
    await mock.setScenario('out-of-order')
    await toggleFacet(page, 'Música') // slow response
    await toggleFacet(page, 'Polygon') // fast response
    await expect(results(page)).toHaveText('11 NFTs encontrados')
    await page.waitForTimeout(2_000) // the stale (slow) response has had time to arrive
    await expect(results(page)).toHaveText('11 NFTs encontrados')
  })

  test('navega do card para o detalhe @main', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Emerald Ape #042' }).first().click()
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  })
})
