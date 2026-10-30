import { cartCount, expect, login, test, USERS } from './support/fixtures'

test.describe('Conta e sessão', () => {
  test('cadastro com validação, conflito e sucesso @main', async ({ page }) => {
    await page.goto('/cadastro')
    await page.getByRole('button', { name: 'Criar perfil' }).click()
    await expect(page.getByLabel('Nome de usuário')).toBeFocused()
    await expect(page.getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')

    await page.getByLabel('Nome de usuário').fill('nova')
    await page.getByLabel('E-mail').fill('NOVA@kurio.test')
    await page.getByLabel('Senha', { exact: true }).fill('fraca')
    await page.getByLabel('Confirmar senha').fill('outra')
    await page.getByRole('button', { name: 'Criar perfil' }).click()
    await expect(page.getByText('A senha precisa ter ao menos 8 caracteres')).toBeVisible()
    await expect(page.getByText('As senhas não coincidem')).toBeVisible()

    await page.getByLabel('Senha', { exact: true }).fill('Segura123')
    await page.getByLabel('Confirmar senha').fill('Segura123')
    await page.getByRole('button', { name: 'Criar perfil' }).click()
    await expect(page.getByText('Este nome de usuário já está em uso.')).toBeVisible()
    await expect(page.getByText('Este e-mail já está cadastrado.')).toBeVisible()

    await page.getByLabel('Nome de usuário').fill('lia')
    await page.getByLabel('E-mail').fill('lia@kurio.test')
    await page.getByRole('button', { name: 'Criar perfil' }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.reload()
    await page.goto('/perfil')
    await expect(page.getByLabel('Nome de usuário')).toHaveValue('lia')
  })

  test('login inválido, retorno ao fluxo e merge do carrinho do visitante @main', async ({
    page,
  }) => {
    await page.goto('/nft/golden-beat-207')
    await page.getByRole('button', { name: 'Comprar' }).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect.poll(() => cartCount(page)).toBe(1)

    await page.goto(`/entrar?redirect=${encodeURIComponent('/carrinho')}`)
    await page.getByLabel('E-mail').fill(USERS.bruno.email)
    await page.getByLabel('Senha', { exact: true }).fill('errada123')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')

    await page.getByLabel('Senha', { exact: true }).fill(USERS.bruno.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(page.getByRole('link', { name: 'Golden Beat #207' })).toBeVisible()
    await page.reload()
    await expect.poll(() => cartCount(page)).toBe(1)
  })

  test('sessão expirada durante a navegação volta ao login preservando o destino', async ({
    page,
    mock,
  }) => {
    await login(page, 'nova')
    await page.goto('/perfil/carteiras')
    await expect(page.getByLabel('Apelido da carteira').first()).toHaveValue('Principal')

    await mock.expireSessions()
    await page.getByRole('link', { name: 'Dados do perfil' }).click()
    await expect(page).toHaveURL(/\/entrar\?redirect=/)
    await expect(page.getByText(/Sua sessão expirou/).first()).toBeVisible()

    await page.getByLabel('E-mail').fill(USERS.nova.email)
    await page.getByLabel('Senha', { exact: true }).fill(USERS.nova.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/perfil$/)
  })

  test('logout e troca de usuário não vazam dados privados', async ({ page }) => {
    await login(page, 'nova')
    await expect.poll(() => cartCount(page)).toBe(17)
    await page.goto('/perfil/favoritos')
    await expect(page.getByRole('link', { name: 'Emerald Ape #042' })).toBeVisible()

    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect.poll(() => cartCount(page)).toBe(0)
    const stored = await page.evaluate(() =>
      [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter(
        (key) => key.startsWith('kurio.session') || key.startsWith('kurio.draft'),
      ),
    )
    expect(stored).toEqual([])

    await login(page, 'bruno')
    await expect.poll(() => cartCount(page)).toBe(0)
    await page.goto('/perfil/favoritos')
    await expect(page.getByRole('link', { name: 'Sage Nomad #009' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Emerald Ape #042' })).toHaveCount(0)
    await page.goto('/perfil/carteiras')
    await expect(page.getByLabel('Nome de exibição').first()).toHaveValue('Bruno Tavares')
  })

  test('rotas privadas exigem login', async ({ page }) => {
    await page.goto('/pagamento')
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpagamento/)
  })
})
