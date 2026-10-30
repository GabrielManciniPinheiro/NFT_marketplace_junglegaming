import sharp from 'sharp'
import { expect, login, test, USERS } from './support/fixtures'

const avatarPng = () =>
  sharp({ create: { width: 320, height: 240, channels: 3, background: '#d28a4c' } })
    .png()
    .toBuffer()

test.describe('Perfil e carteiras', () => {
  test('edita dados com erro de conflito e persiste após refresh', async ({ page }) => {
    await login(page, 'nova')
    await page.goto('/perfil')
    await page.getByLabel('Nome de usuário').fill('bruno')
    await page.getByRole('button', { name: 'Salvar dados' }).click()
    await expect(page.getByText('Este nome de usuário já está em uso.')).toBeVisible()
    await expect(page.getByLabel('Nome de usuário')).toBeFocused()

    await page.getByLabel('Nome de usuário').fill('nova.r')
    await page.getByLabel('Nome de exibição').fill('Nova R. Ribeiro')
    await page.getByRole('button', { name: 'Salvar dados' }).click()
    await expect(page.getByText('Dados do perfil salvos.')).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Nova R. Ribeiro')
    await expect(page.getByRole('button', { name: 'Conta de Nova R. Ribeiro' })).toBeVisible()
  })

  test('avatar aceita imagem e mostra o erro da API para arquivo inválido', async ({ page }) => {
    await login(page, 'nova')
    await page.goto('/perfil')
    await page
      .locator('#avatar-input')
      .setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: await avatarPng() })
    await expect(page.getByText('Foto do perfil atualizada.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remover' })).toBeVisible()

    await page
      .locator('#avatar-input')
      .setInputFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('texto') })
    await expect(
      page.locator('section[aria-labelledby=avatar-title]').getByRole('alert'),
    ).toHaveText('Use uma imagem PNG, JPG ou WebP.')
  })

  test('altera a senha com validações e entra com a nova senha', async ({ page }) => {
    await login(page, 'nova')
    await page.goto('/perfil')
    const submit = page.getByRole('button', { name: 'Alterar senha' })
    await page.locator('#password-current').fill('errada123')
    await page.locator('#password-new').fill('NovaSenha1')
    await page.locator('#password-confirm').fill('NovaSenha2')
    await submit.click()
    await expect(page.getByText('As senhas não coincidem')).toBeVisible()

    await page.locator('#password-confirm').fill('NovaSenha1')
    await submit.click()
    await expect(page.getByText('Senha atual incorreta.')).toBeVisible()

    await page.locator('#password-current').fill(USERS.nova.password)
    await submit.click()
    await expect(page.getByText('Senha alterada com sucesso.')).toBeVisible()

    await page.getByRole('button', { name: 'Sair' }).click()
    await page.goto('/entrar')
    await page.getByLabel('E-mail').fill(USERS.nova.email)
    await page.getByLabel('Senha', { exact: true }).fill('NovaSenha1')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).not.toHaveURL(/entrar/)
  })

  test('cadastra carteira secundária com erros de validação da API', async ({ page }) => {
    await login(page, 'bruno')
    await page.goto('/perfil/carteiras')
    await expect(page.getByText('Você ainda não adicionou uma carteira secundária.')).toBeVisible()
    await page.getByLabel('Igual à carteira principal').check()
    await page.getByRole('button', { name: 'Adicionar' }).click()

    const section = page.locator('section[aria-labelledby=secondary-title]')
    await expect(section.getByLabel('Apelido da carteira')).toHaveValue('Reserva')
    await expect(section.getByLabel('Código de indicação')).toHaveValue('BRUNO01')

    await section
      .getByLabel('Endereço da carteira')
      .fill('0x3B7cE2a91F04d8B6e5C1a7D9f2E0b4C8a6D1e3F5')
    await section.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(
      section.getByText('Este endereço já está cadastrado na carteira "Principal".'),
    ).toBeVisible()

    await section
      .getByLabel('Endereço da carteira')
      .fill('0x2222222222222222222222222222222222222222')
    await section.getByLabel('Código de indicação').fill('NAOEXISTE')
    await section.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(section.getByText('Código de indicação não encontrado.')).toBeVisible()

    await section.getByLabel('Código de indicação').fill('KURIO2026')
    await section.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Usada como alternativa no pagamento.')).toBeVisible()
    await page.reload()
    await expect(page.locator('#wallet-secondary-address')).toHaveValue(
      '0x2222222222222222222222222222222222222222',
    )
  })

  test('valida formato do endereço por rede no cliente', async ({ page }) => {
    await login(page, 'nova')
    await page.goto('/perfil/carteiras')
    const primary = page.locator('section[aria-labelledby=primary-title]')
    await primary.getByLabel('Endereço da carteira').fill('0x12')
    await primary.getByLabel('Endereço da carteira').blur()
    await expect(primary.getByText('Use 0x seguido de 40 caracteres hexadecimais')).toBeVisible()
    await expect(primary.getByLabel('Endereço da carteira')).toHaveAttribute('aria-invalid', 'true')
  })
})
