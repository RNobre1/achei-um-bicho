import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures'

async function preencherCasoPerdido(page: Page, nome: string) {
  await page.goto('/')

  await page.getByRole('tab', { name: 'Publicar' }).click()
  await page.getByRole('button', { name: /Meu bicho sumiu/i }).click()

  // Passo 2
  await page.getByRole('button', { name: 'Cachorro' }).click()
  await page.getByRole('button', { name: 'Médio' }).click()
  await page.getByRole('button', { name: 'Caramelo' }).click()
  await page.getByRole('button', { name: 'Sem coleira' }).click()
  await page.getByLabel('Nome que ele atende').fill(nome)
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Passo 3
  await page.getByLabel('Bairro').fill('Prainha')
  await page.getByRole('button', { name: 'Hoje' }).click()
  await page.getByRole('button', { name: 'À tarde' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Passo 4
  await page.getByLabel('Resposta').nth(0).fill('Sinal na cauda')
  await page.getByLabel('Resposta').nth(1).fill(nome)
  await page.getByLabel('Resposta').nth(2).fill('Nada')
  await page.getByLabel('Seu nome ou apelido').fill('Carla')
  await page.getByLabel('Telefone (opcional)').fill('93991234567')
}

test.describe('Fluxo 3: Publicar sem conexão e sincronização pela fila', () => {
  test('ao publicar sem conexão, guarda no aparelho e envia sozinho ao reconectar', async ({
    page,
    context,
  }) => {
    await preencherCasoPerdido(page, 'Snoop')

    // Corta a conexão antes de submeter
    await context.setOffline(true)

    await page.getByRole('button', { name: 'Publicar' }).click()

    // Deve mostrar a tela de guardado no celular
    await expect(page.getByText(/Guardado no celular/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ver fila de envio' })).toBeVisible()

    // Restaura a conexão: o item sobe sozinho e a fila mostra "Publicado" em Enviados
    await context.setOffline(false)

    // Acessa a tela da fila
    await page.getByRole('button', { name: 'Ver fila de envio' }).click()
    await expect(page.getByText('Fila de envio', { exact: true })).toBeVisible()

    // A fila mostra "Publicado" em Enviados
    await expect(page.getByText('Enviados')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Publicado')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Snoop')).toBeVisible()
  })

  test('com a fila aberta, o caso passa a publicado quando a rede volta, sem sair da tela', async ({
    page,
    context,
  }) => {
    await preencherCasoPerdido(page, 'Pirata')
    await context.setOffline(true)
    await page.getByRole('button', { name: 'Publicar' }).click()
    await expect(page.getByText(/Guardado no celular/i)).toBeVisible()

    // é o que se faz na apresentação: abre a fila ainda sem rede e desliga o modo avião
    await page.getByRole('button', { name: 'Ver fila de envio' }).click()
    await expect(page.getByText('Esperando conexão')).toBeVisible()

    await context.setOffline(false)
    await expect(page.getByText('Publicado')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Esperando conexão')).toHaveCount(0)
  })
})
