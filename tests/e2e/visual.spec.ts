import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'
import { expect, FIXED_NOW, loadAllImages, login, test } from './support/fixtures'

/**
 * Visual regression of the Figma screens with stable data: seeded catalog, no latency,
 * fixed clock (countdown/dates), no toasts and no Mock Lab trigger.
 *
 * Fonts rasterize differently per OS, so baselines live per platform. On a platform without
 * baselines the screens are skipped with instructions instead of failing on the first run;
 * `npm run test:e2e:update` creates them.
 */
const HIDE = 'tests/e2e/support/screenshot.css'

async function snapshot(page: Page, name: string) {
  await page.waitForLoadState('networkidle')
  await loadAllImages(page)
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, stylePath: HIDE })
}

test.describe('Regressão visual @main', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const baselines = path.dirname(testInfo.snapshotPath('screen.png', { kind: 'screenshot' }))
    const updating = ['all', 'changed'].includes(testInfo.config.updateSnapshots)
    test.skip(
      !updating && !existsSync(baselines),
      `Sem referências visuais para ${process.platform}/${testInfo.project.name}: gere com "npm run test:e2e:update".`,
    )
    await page.clock.setFixedTime(FIXED_NOW)
  })

  test('início', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#catalogo article')).toHaveCount(12)
    await snapshot(page, 'inicio')
  })

  test('detalhe do NFT', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await expect(page.getByText('Mais desta coleção')).toBeVisible()
    await expect(page.locator('section[aria-labelledby=related-title] article')).toHaveCount(5)
    await snapshot(page, 'detalhe')
  })

  test('carrinho', async ({ page }) => {
    await login(page, 'nova')
    await page.goto('/carrinho')
    await expect(page.getByText('26.846 ETH')).toBeVisible()
    await expect(page.locator('section[aria-labelledby=related-title] article')).toHaveCount(5)
    await snapshot(page, 'carrinho')
  })

  test('pagamento', async ({ page }) => {
    await login(page, 'nova')
    await page.goto('/pagamento')
    await expect(page.locator('#collector-referralCode')).toHaveValue('NOVA01')
    await snapshot(page, 'pagamento')
  })
})
