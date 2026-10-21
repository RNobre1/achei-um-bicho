import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'

describe('GET /reivindicacoes/:rid', () => {
  let app: INestApplication
  const prisma = new PrismaClient()

  beforeAll(async () => {
    app = await criarAppDeTeste()
  })

  beforeEach(async () => {
    await limparBanco(prisma)
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  async function publicar(sobrescrever: Record<string, unknown> = {}): Promise<{ id: string; codigoEdicao: string }> {
    const { body } = await request(app.getHttpServer()).post('/casos').send(casoValido(sobrescrever)).expect(201)
    return body
  }

  async function criarReivindicacao(casoId: string) {
    const { body: perguntas } = await request(app.getHttpServer()).get(`/casos/${casoId}/perguntas`).expect(200)
    const { body } = await request(app.getHttpServer())
      .post(`/casos/${casoId}/reivindicacoes`)
      .send({
        respostas: perguntas.map((p: { id: string }) => ({ perguntaId: p.id, texto: 'resp' })),
        pessoa: { nome: 'Reivindicante', telefone: '93991112233', referencia: 'Perto da igreja' },
      })
      .expect(201)
    return body as { id: string; codigoAcompanhamento: string; veredito: string }
  }

  it('exige x-codigo-acompanhamento válido (403) e responde 404 para id inexistente', async () => {
    const { id } = await publicar()
    const reiv = await criarReivindicacao(id)

    await request(app.getHttpServer()).get(`/reivindicacoes/${reiv.id}`).expect(403)
    await request(app.getHttpServer())
      .get(`/reivindicacoes/${reiv.id}`)
      .set('x-codigo-acompanhamento', 'ERRADO-1234')
      .expect(403)

    await request(app.getHttpServer())
      .get(`/reivindicacoes/${randomUUID()}`)
      .set('x-codigo-acompanhamento', reiv.codigoAcompanhamento)
      .expect(404)
  })

  it('retorna situação sem contato enquanto pendente', async () => {
    const { id } = await publicar()
    const reiv = await criarReivindicacao(id)

    const { body } = await request(app.getHttpServer())
      .get(`/reivindicacoes/${reiv.id}`)
      .set('x-codigo-acompanhamento', reiv.codigoAcompanhamento)
      .expect(200)

    expect(body).toEqual({
      id: reiv.id,
      veredito: 'pendente',
      caso: { id, tipo: 'perdido', estado: 'procurando' },
      contato: null,
    })

    const noBanco = await prisma.tentativaVerificacao.findUniqueOrThrow({ where: { id: reiv.id } })
    expect(noBanco.contatoVistoEm).toBeNull()
  })

  it('libera contato no caso encontrado com local.referencia e grava contato_visto_em na primeira leitura', async () => {
    const encontrado = await publicar({
      tipo: 'encontrado',
      local: { ...casoValido().local, referencia: 'Na frente do posto de saúde' },
      animal: { ...casoValido().animal, nome: undefined, castrado: undefined },
      autor: { nome: 'Quem achou o cão', telefone: '93999998888' },
    })
    const reiv = await criarReivindicacao(encontrado.id)

    // Aceita a reivindicação
    await request(app.getHttpServer())
      .post(`/casos/${encontrado.id}/reivindicacoes/${reiv.id}/veredito`)
      .set('x-codigo-edicao', encontrado.codigoEdicao)
      .send({ veredito: 'aceita' })
      .expect(200)

    // 1ª leitura com contato
    const primeira = await request(app.getHttpServer())
      .get(`/reivindicacoes/${reiv.id}`)
      .set('x-codigo-acompanhamento', reiv.codigoAcompanhamento)
      .expect(200)

    expect(primeira.body).toEqual({
      id: reiv.id,
      veredito: 'aceita',
      caso: { id: encontrado.id, tipo: 'encontrado', estado: 'em_contato' },
      contato: {
        nome: 'Quem achou o cão',
        telefone: '93999998888',
        referencia: 'Na frente do posto de saúde',
      },
    })

    const tentativaAposPrimeira = await prisma.tentativaVerificacao.findUniqueOrThrow({ where: { id: reiv.id } })
    expect(tentativaAposPrimeira.contatoVistoEm).not.toBeNull()
    const primeiraData = tentativaAposPrimeira.contatoVistoEm

    // 2ª leitura não altera contato_visto_em
    await request(app.getHttpServer())
      .get(`/reivindicacoes/${reiv.id}`)
      .set('x-codigo-acompanhamento', reiv.codigoAcompanhamento)
      .expect(200)

    const tentativaAposSegunda = await prisma.tentativaVerificacao.findUniqueOrThrow({ where: { id: reiv.id } })
    expect(tentativaAposSegunda.contatoVistoEm).toEqual(primeiraData)
  })

  it('no caso perdido aceito, contato liberado traz referencia nula', async () => {
    const perdido = await publicar({
      tipo: 'perdido',
      autor: { nome: 'Tutor que perdeu', telefone: '93988887777' },
    })
    const reiv = await criarReivindicacao(perdido.id)

    // Aceita a reivindicação
    await request(app.getHttpServer())
      .post(`/casos/${perdido.id}/reivindicacoes/${reiv.id}/veredito`)
      .set('x-codigo-edicao', perdido.codigoEdicao)
      .send({ veredito: 'aceita' })
      .expect(200)

    const { body } = await request(app.getHttpServer())
      .get(`/reivindicacoes/${reiv.id}`)
      .set('x-codigo-acompanhamento', reiv.codigoAcompanhamento)
      .expect(200)

    expect(body.contato).toEqual({
      nome: 'Tutor que perdeu',
      telefone: '93988887777',
      referencia: null,
    })
  })
})
