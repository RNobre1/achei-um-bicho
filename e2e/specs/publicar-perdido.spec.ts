import { expect, test } from '../fixtures'

test.describe('Fluxo 1: Publicar caso perdido e receber aviso', () => {
  test('publica caso perdido pelos 4 passos, confere no mural e recebe aviso de outra pessoa', async ({
    page,
    browser,
  }) => {
    await page.goto('/')

    // Navega para a aba Publicar
    await page.getByRole('tab', { name: 'Publicar' }).click()

    // Passo 1: Tipo de caso
    await expect(page.getByText(/PASSO 1 DE 4/i)).toBeVisible()
    await expect(page.getByText(/O que aconteceu\?/i)).toBeVisible()
    await page.getByRole('button', { name: /Meu bicho sumiu/i }).click()

    // Passo 2: Características do animal
    await expect(page.getByText(/PASSO 2 DE 4/i)).toBeVisible()
    await page.getByRole('button', { name: 'Cachorro' }).click()
    await page.getByRole('button', { name: 'Médio' }).click()
    await page.getByRole('button', { name: 'Caramelo' }).click()
    await page.getByRole('button', { name: 'Sem coleira' }).click()
    await page.getByLabel('Nome que ele atende').fill('Pipoca')
    await page.getByLabel('O que mais ajuda a reconhecer (opcional)').fill('Sumiu perto da praça')
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Passo 3: Onde e quando
    await expect(page.getByText(/PASSO 3 DE 4/i)).toBeVisible()
    await page.getByLabel('Bairro').fill('Prainha')
    await page.getByRole('button', { name: 'Hoje' }).click()
    await page.getByRole('button', { name: 'À tarde' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Passo 4: Verificação (perguntas e autor)
    await expect(page.getByText(/PASSO 4 DE 4/i)).toBeVisible()
    await page.getByLabel('Resposta').nth(0).fill('Tem uma mancha na barriga')
    await page.getByLabel('Resposta').nth(1).fill('Pipoca')
    await page.getByLabel('Resposta').nth(2).fill('Não usava nada')
    await page.getByLabel('Seu nome ou apelido').fill('Carlos')
    await page.getByLabel('Telefone (opcional)').fill('93991234567')

    // Publica o caso
    await page.getByRole('button', { name: 'Publicar' }).click()

    // Tela de confirmação com código de edição
    await expect(page.getByText('Publicado.')).toBeVisible()
    await expect(page.getByText('SEU CÓDIGO DE EDIÇÃO')).toBeVisible()
    const codigoElemento = page.locator('text=/[2-9A-HJ-KM-NP-Z]{4}-[2-9A-HJ-KM-NP-Z]{4}/')
    await expect(codigoElemento).toBeVisible()

    // Vai ao mural "Perto" e confere que o caso aparece
    await page.getByRole('tab', { name: 'Perto' }).click()
    const cardPipoca = page.getByRole('button', { name: /Pipoca/i })
    await expect(cardPipoca).toBeVisible()

    // Abre o caso e confere área aproximada (sem ponto exato)
    await cardPipoca.click()
    await expect(page.getByText(/ÁREA APROXIMADA/i)).toBeVisible()
    await expect(page.getByText('Pipoca').last()).toBeVisible()
    const urlCaso = page.url()

    // Outro contexto do navegador (outra pessoa) avisa que viu o animal
    const contextoOutro = await browser.newContext({
      geolocation: { latitude: -2.4191, longitude: -54.7408 },
      permissions: ['geolocation'],
      viewport: { width: 412, height: 892 },
    })
    const paginaOutro = await contextoOutro.newPage()

    try {
      await paginaOutro.goto(urlCaso)
      await expect(paginaOutro.getByRole('button', { name: 'Vi esse bicho na rua' })).toBeVisible()
      await paginaOutro.getByRole('button', { name: 'Vi esse bicho na rua' }).click()

      // Preenche o aviso de avistamento
      await expect(paginaOutro.getByText('Onde você viu?')).toBeVisible()
      await paginaOutro.getByRole('button', { name: 'Agora há pouco' }).click()
      await paginaOutro.getByLabel('Bairro (opcional)').fill('Prainha')
      await paginaOutro.getByLabel('O que você viu (opcional)').fill('Vi correndo perto da padaria')
      await paginaOutro.getByRole('button', { name: 'Enviar aviso' }).click()

      await expect(paginaOutro.getByText('Aviso enviado.')).toBeVisible()
    } finally {
      await contextoOutro.close()
    }

    // O autor abre o caso e vê o aviso registrado
    await page.goto(urlCaso)
    await expect(page.getByText('Vi correndo perto da padaria')).toBeVisible()
  })
})
