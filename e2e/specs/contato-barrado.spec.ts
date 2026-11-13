import { expect, test } from '../fixtures'

test.describe('Fluxo 5: Texto com contato barrado', () => {
  test('bloqueia relato com telefone e permite relato com data com hífen', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('tab', { name: 'Publicar' }).click()
    await page.getByRole('button', { name: /Meu bicho sumiu/i }).click()

    // Passo 2: Preenche dados básicos do animal
    await page.getByRole('button', { name: 'Cachorro' }).click()
    await page.getByRole('button', { name: 'Médio' }).click()
    await page.getByRole('button', { name: 'Caramelo' }).click()
    await page.getByRole('button', { name: 'Sem coleira' }).click()
    await page.getByLabel('Nome que ele atende').fill('Rex')

    // Tenta avançar com telefone no relato
    await page
      .getByLabel('O que mais ajuda a reconhecer (opcional)')
      .fill('Sumiu na praça ligue 93991234567 urgente')
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Deve exibir o aviso de pendência de contato e permanecer no Passo 2
    await expect(page.getByText(/Parece um telefone ou link/i)).toBeVisible()
    await expect(page.getByText(/PASSO 2 DE 4/i)).toBeVisible()
    await expect(page.getByText(/PASSO 3 DE 4/i)).toHaveCount(0)

    // Altera o relato para conter uma data com hífen válida (ex: 12-11-2026)
    await page
      .getByLabel('O que mais ajuda a reconhecer (opcional)')
      .fill('Sumiu no dia 12-11-2026 perto do mercado')
    await page.getByRole('button', { name: 'Continuar' }).click()

    // O aviso de contato não deve mais aparecer e deve avançar para o Passo 3
    await expect(page.getByText(/Parece um telefone ou link/i)).toHaveCount(0)
    await expect(page.getByText(/PASSO 3 DE 4/i)).toBeVisible()
    await expect(page.getByText(/Onde e quando\?/i)).toBeVisible()
  })
})
