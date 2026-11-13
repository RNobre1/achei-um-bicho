import { expect, test } from '../fixtures'

test.describe('Fluxo 2: Reivindicação e contato mediado', () => {
  test('publica caso encontrado, outro contexto reivindica e contato é liberado após aceite', async ({
    page,
    browser,
  }) => {
    await page.goto('/')

    // Autor publica um caso ENCONTRADO
    await page.getByRole('tab', { name: 'Publicar' }).click()
    await page.getByRole('button', { name: /Achei um bicho na rua/i }).click()

    // Passo 2: Características
    await page.getByRole('button', { name: 'Cachorro' }).click()
    await page.getByRole('button', { name: 'Médio' }).click()
    await page.getByRole('button', { name: 'Caramelo' }).click()
    await page.getByRole('button', { name: 'Com coleira' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Passo 3: Onde e quando com Ponto de referência
    await page.getByLabel('Bairro').fill('Aparecida')
    await page.getByLabel('Ponto de referência (opcional)').fill('Ao lado do mercado central')
    await page.getByRole('button', { name: 'Hoje' }).click()
    await page.getByRole('button', { name: 'À tarde' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Passo 4: Verificação e dados do autor
    await page.getByLabel('Resposta').nth(0).fill('Mancha branca')
    await page.getByLabel('Resposta').nth(1).fill('Cicatriz na orelha')
    await page.getByLabel('Resposta').nth(2).fill('Abana o rabo')
    await page.getByLabel('Seu nome ou apelido').fill('Dona Maria')
    await page.getByLabel('Telefone (opcional)').fill('93991234567')

    await page.getByRole('button', { name: 'Publicar' }).click()
    await expect(page.getByText('Publicado.')).toBeVisible()

    // Abre o caso e copia a URL
    await page.getByRole('button', { name: 'Ver meu caso' }).click()
    const urlCaso = page.url()

    // Outro contexto reivindica o animal
    const contextoReivindicante = await browser.newContext({
      geolocation: { latitude: -2.4191, longitude: -54.7408 },
      permissions: ['geolocation'],
      viewport: { width: 412, height: 892 },
    })
    const paginaReivindicante = await contextoReivindicante.newPage()

    try {
      await paginaReivindicante.goto(urlCaso)
      await expect(
        paginaReivindicante.getByRole('button', { name: 'Acho que esse bicho é meu' }),
      ).toBeVisible()
      await paginaReivindicante.getByRole('button', { name: 'Acho que esse bicho é meu' }).click()

      // Responde às perguntas de verificação
      const camposResposta = paginaReivindicante.getByPlaceholder('Sua resposta sobre o sinal do animal')
      await camposResposta.nth(0).fill('Mancha branca')
      await camposResposta.nth(1).fill('Cicatriz na orelha')
      await camposResposta.nth(2).fill('Abana o rabo')

      await paginaReivindicante.getByLabel('Seu nome').fill('João Silva')
      await paginaReivindicante.getByLabel('Seu telefone com DDD').fill('93998765432')

      await paginaReivindicante.getByRole('button', { name: 'Enviar respostas' }).click()

      // Confirma recebimento do código de acompanhamento
      await expect(paginaReivindicante.getByText('SEU CÓDIGO DE ACOMPANHAMENTO')).toBeVisible()
      await paginaReivindicante.getByRole('button', { name: 'Acompanhar situação' }).click()

      // Antes do aceite: nenhum telefone do autor deve aparecer
      await expect(paginaReivindicante.getByText(/SITUAÇÃO DA REIVINDICAÇÃO/i)).toBeVisible()
      await expect(paginaReivindicante.getByText('93991234567')).toHaveCount(0)
      await expect(paginaReivindicante.getByText(/Telefone:/i)).toHaveCount(0)

      const urlSituacao = paginaReivindicante.url()

      // O autor abre a tela do caso e aceita a reivindicação
      await page.goto(urlCaso)
      await expect(page.getByRole('button', { name: 'Aceitar respostas' })).toBeVisible()
      await page.getByRole('button', { name: 'Aceitar respostas' }).click()
      await expect(page.getByText('CONTATO LIBERADO')).toBeVisible()

      // O reivindicante atualiza a situação e agora vê nome, telefone e referência
      await paginaReivindicante.goto(urlSituacao)
      await expect(paginaReivindicante.getByText('CONTATO LIBERADO')).toBeVisible()
      await expect(paginaReivindicante.getByText('Nome: Dona Maria')).toBeVisible()
      await expect(paginaReivindicante.getByText(/93991234567/)).toBeVisible()
      await expect(paginaReivindicante.getByText(/Ao lado do mercado central/)).toBeVisible()
    } finally {
      await contextoReivindicante.close()
    }
  })
})
