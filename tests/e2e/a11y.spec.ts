import AxeBuilder from '@axe-core/playwright'
import { expect, isMobile, login, test } from './support/fixtures'

test.describe('Acessibilidade', () => {
  test('skip link e navegação por teclado no header', async ({ page }) => {
    test.skip(isMobile(page), 'teclado físico é verificado no desktop')
    await page.goto('/')
    await expect(page.locator('#catalogo article').first()).toBeVisible()
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#main-content$/)

    await page.goto('/mercado')
    await page.getByRole('link', { name: 'Kurio, página inicial' }).focus()
    const nav = page.getByRole('navigation', { name: 'Principal' })
    await page.keyboard.press('Tab')
    await expect(nav.getByRole('link', { name: 'Início' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(nav.getByRole('link', { name: 'Mercado' })).toBeFocused()
  })

  test('diálogo de busca prende e devolve o foco', async ({ page }) => {
    test.skip(isMobile(page), 'teclado físico é verificado no desktop')
    await page.goto('/mercado')
    const trigger = page.getByRole('button', { name: 'Buscar NFTs' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Buscar no catálogo' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('searchbox')).toBeFocused()
    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab')
    await expect(dialog.locator(':focus')).toHaveCount(1) // focus never leaves the dialog
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('drawer de filtros no mobile controla o foco @main', async ({ page }) => {
    test.skip(!isMobile(page), 'drawer só existe no mobile')
    await page.goto('/mercado')
    const trigger = page.getByRole('button', { name: /^Filtros/ })
    await trigger.click()
    const drawer = page.getByRole('dialog', { name: 'Filtros' })
    await expect(drawer).toBeVisible()
    await expect(drawer.locator(':focus')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('validação anuncia erros ligados aos campos', async ({ page }) => {
    await page.goto('/entrar')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    const email = page.getByLabel('E-mail')
    await expect(email).toBeFocused()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    expect(describedBy).toContain('login-email-error')
    await expect(page.locator(`#${describedBy}`)).toHaveText('Informe um e-mail válido')
  })

  for (const [name, path, auth] of [
    ['início', '/', false],
    ['detalhe', '/nft/emerald-ape-042', false],
    ['carrinho', '/carrinho', true],
    ['pagamento', '/pagamento', true],
    ['entrar', '/entrar', false],
  ] as const) {
    test(`sem violações sérias de acessibilidade: ${name} @main`, async ({ page }) => {
      if (auth) await login(page, 'nova')
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      const serious = results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      )
      expect(serious.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([])
    })
  }

  test('anuncia mudanças de rota', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Emerald Ape #042' }).first().click()
    await expect(page.locator('#main-content')).toBeFocused()
    await expect(page.locator('p[aria-live="polite"][aria-atomic="true"]')).toContainText(
      'Emerald Ape #042 | Kurio',
    )
  })

  test.describe('preferência por movimento reduzido', () => {
    test.use({ colorScheme: 'dark', reducedMotion: 'reduce' })
    test('skeletons não animam', async ({ page, mock }) => {
      await mock.preset('slow')
      await page.goto('/mercado')
      const skeleton = page.locator('[data-slot=skeleton]').first()
      await expect(skeleton).toBeVisible()
      const animation = await skeleton.evaluate(
        (element) => getComputedStyle(element).animationName,
      )
      expect(animation).toBe('none')
    })
  })
})
