import { expect, test } from '../fixtures'

test.describe('Fluxo 4: Encerrar caso', () => {
  test('autor encerra caso com desfecho voltou para casa e caso sai do mural', async ({ page }) => {
    await page.goto('/')

    // Publica o caso
    await page.getByRole('tab', { name: 'Publicar' }).click()
    await page.getByRole('button', { name: /Meu bicho sumiu/i }).click()

    await page.getByRole('button', { name: 'Cachorro' }).click()
    await page.getByRole('button', { name: 'Médio' }).click()
    await page.getByRole('button', { name: 'Caramelo' }).click()
    await page.getByRole('button', { name: 'Sem coleira' }).click()
    await page.getByLabel('Nome que ele atende').fill('Totó')
    await page.getByRole('button', { name: 'Continuar' }).click()

    await page.getByLabel('Bairro').fill('Prainha')
    await page.getByRole('button', { name: 'Hoje' }).click()
    await page.getByRole('button', { name: 'À tarde' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()

    await page.getByLabel('Resposta').nth(0).fill('Sinal na pata')
    await page.getByLabel('Resposta').nth(1).fill('Totó')
    await page.getByLabel('Resposta').nth(2).fill('Nada')
    await page.getByLabel('Seu nome ou apelido').fill('Beatriz')
    await page.getByLabel('Telefone (opcional)').fill('93991234567')

    await page.getByRole('button', { name: 'Publicar' }).click()
    await expect(page.getByText('Publicado.')).toBeVisible()

    // Confere que Totó aparece no mural Perto
    await page.getByRole('tab', { name: 'Perto' }).click()
    await expect(page.getByRole('button', { name: /Totó/i })).toBeVisible()

    // Vai para a aba Meus casos
    await page.getByRole('tab', { name: 'Meus casos' }).click()
    await expect(page.getByText('Totó')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Encerrar caso' })).toBeVisible()
    await page.getByRole('button', { name: 'Encerrar caso' }).click()

    // Tela de encerramento
    await expect(page.getByText('ENCERRAR CASO', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Voltou para casa' }).click()
    await page.getByRole('button', { name: 'Confirmar encerramento' }).click()

    await expect(page.getByText('Caso encerrado.')).toBeVisible()
    await expect(page.getByText(/O caso saiu do mural/i)).toBeVisible()

    // Volta para o mural Perto e confere que o caso saiu do mural
    await page.getByRole('button', { name: 'Voltar para Meus Casos' }).click()
    await page.getByRole('tab', { name: 'Perto' }).click()
    await expect(page.getByText('Nenhum caso aberto neste raio agora')).toBeVisible()
    await expect(page.getByRole('button', { name: /Totó/i })).toHaveCount(0)
  })
})
