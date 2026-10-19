import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'

describe('GET /casos/:id/reivindicacoes', () => {
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

  async function obterPerguntas(casoId: string) {
    const { body } = await request(app.getHttpServer()).get(`/casos/${casoId}/perguntas`).expect(200)
    return body as { id: string; ordem: number; enunciado: string }[]
  }

  it('exige x-codigo-edicao válido para listar reivindicações (403)', async () => {
    const { id, codigoEdicao } = await publicar()

    await request(app.getHttpServer()).get(`/casos/${id}/reivindicacoes`).expect(403)
    await request(app.getHttpServer())
      .get(`/casos/${id}/reivindicacoes`)
      .set('x-codigo-edicao', 'ERRADO-1234')
      .expect(403)

    await request(app.getHttpServer())
      .get(`/casos/${randomUUID()}/reivindicacoes`)
      .set('x-codigo-edicao', codigoEdicao)
      .expect(404)
  })

  it('mostra respostas com respostaEsperada, denunciasDoTelefone e contato nulo enquanto pendente', async () => {
    const { id, codigoEdicao } = await publicar()
    const perguntas = await obterPerguntas(id)

    // Reivindicação 1 com telefone A
    await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes`)
      .send({
        respostas: [
          { perguntaId: perguntas[0]!.id, texto: 'orelha rasgada' },
          { perguntaId: perguntas[1]!.id, texto: 'Nego' },
          { perguntaId: perguntas[2]!.id, texto: 'coleira vermelha' },
        ],
        pessoa: { nome: 'Carlos', telefone: '93991223344', referencia: 'Rua das Flores 123' },
      })
      .expect(201)

    // Simula uma denúncia anterior contra este telefone em outro caso
    const outroCaso = await publicar()
    const outraPessoa = await prisma.pessoa.create({
      data: { nome: 'Carlos Fake', telefone: '93991223344' },
    })
    const outraTentativa = await prisma.tentativaVerificacao.create({
      data: {
        casoId: outroCaso.id,
        pessoaId: outraPessoa.id,
        codigoAcompanhamento: 'hash-fake-123',
      },
    })
    await prisma.denuncia.create({
      data: {
        casoId: outroCaso.id,
        tentativaId: outraTentativa.id,
        motivo: 'pediu_dinheiro',
        texto: 'Cobrou 500 reais para devolver',
      },
    })

    const { body } = await request(app.getHttpServer())
      .get(`/casos/${id}/reivindicacoes`)
      .set('x-codigo-edicao', codigoEdicao)
      .expect(200)

    expect(body).toHaveLength(1)
    const [reiv] = body
    expect(reiv).toMatchObject({
      id: expect.any(String),
      veredito: 'pendente',
      decididoEm: null,
      denunciasDoTelefone: 1,
      contato: null,
    })
    expect(reiv.criadoEm).toEqual(expect.any(String))
    expect(reiv.respostas).toEqual([
      {
        ordem: 1,
        enunciado: 'Qual sinal ele tem que não aparece na foto?',
        respostaEsperada: 'Falta um pedaço da orelha esquerda',
        respostaDada: 'orelha rasgada',
      },
      {
        ordem: 2,
        enunciado: 'Que nome ele atende?',
        respostaEsperada: 'Nego',
        respostaDada: 'Nego',
      },
      {
        ordem: 3,
        enunciado: 'O que ele usava quando sumiu?',
        respostaEsperada: 'Coleira vermelha de nylon',
        respostaDada: 'coleira vermelha',
      },
    ])
  })

  it('libera contato após aceite, com referência para caso perdido e sem referência para caso encontrado', async () => {
    // 1. Caso perdido: autor recebe tentativa.referencia
    const perdido = await publicar({ tipo: 'perdido' })
    const pergPerdido = await obterPerguntas(perdido.id)
    const { body: r1 } = await request(app.getHttpServer())
      .post(`/casos/${perdido.id}/reivindicacoes`)
      .send({
        respostas: pergPerdido.map((p) => ({ perguntaId: p.id, texto: 'resp' })),
        pessoa: { nome: 'Achei o bicho', telefone: '93991112233', referencia: 'Trav. 15 de Novembro 456' },
      })
      .expect(201)

    await prisma.tentativaVerificacao.update({
      where: { id: r1.id },
      data: { veredito: 'aceita', decididoEm: new Date() },
    })

    const resPerdido = await request(app.getHttpServer())
      .get(`/casos/${perdido.id}/reivindicacoes`)
      .set('x-codigo-edicao', perdido.codigoEdicao)
      .expect(200)

    expect(resPerdido.body[0].contato).toEqual({
      nome: 'Achei o bicho',
      telefone: '93991112233',
      referencia: 'Trav. 15 de Novembro 456',
    })

    // 2. Caso encontrado: autor já está com o animal, recebe referencia null de quem reivindica
    const encontrado = await publicar({
      tipo: 'encontrado',
      animal: { ...casoValido().animal, nome: undefined, castrado: undefined },
    })
    const pergEncontrado = await obterPerguntas(encontrado.id)
    const { body: r2 } = await request(app.getHttpServer())
      .post(`/casos/${encontrado.id}/reivindicacoes`)
      .send({
        respostas: pergEncontrado.map((p) => ({ perguntaId: p.id, texto: 'resp' })),
        pessoa: { nome: 'Dono do bicho', telefone: '93991114455' },
      })
      .expect(201)

    await prisma.tentativaVerificacao.update({
      where: { id: r2.id },
      data: { veredito: 'aceita', decididoEm: new Date() },
    })

    const resEncontrado = await request(app.getHttpServer())
      .get(`/casos/${encontrado.id}/reivindicacoes`)
      .set('x-codigo-edicao', encontrado.codigoEdicao)
      .expect(200)

    expect(resEncontrado.body[0].contato).toEqual({
      nome: 'Dono do bicho',
      telefone: '93991114455',
      referencia: null,
    })
  })
})
