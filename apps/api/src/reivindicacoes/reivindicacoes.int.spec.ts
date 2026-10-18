import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'
import { conferirCodigoEdicao } from '../casos/codigo-edicao'

describe('POST /casos/:id/reivindicacoes', () => {
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

  it('registra reivindicação com respostas, pessoa e devolve código de acompanhamento', async () => {
    const { id } = await publicar()
    const perguntas = await obterPerguntas(id)

    const payload = {
      respostas: [
        { perguntaId: perguntas[0]!.id, texto: 'Falta um pedaço da orelha' },
        { perguntaId: perguntas[1]!.id, texto: 'Nego' },
        { perguntaId: perguntas[2]!.id, texto: 'Coleira de nylon' },
      ],
      pessoa: {
        nome: 'Maria Silva',
        telefone: '93991112233',
        referencia: 'Perto do colégio Barjonas',
      },
    }

    const { body } = await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes`)
      .send(payload)
      .expect(201)

    expect(body).toMatchObject({
      id: expect.any(String),
      veredito: 'pendente',
      codigoAcompanhamento: expect.stringMatching(/^[2-9A-Z]{4}-[2-9A-Z]{4}$/),
    })

    const tentativa = await prisma.tentativaVerificacao.findUniqueOrThrow({
      where: { id: body.id },
      include: { pessoa: true, respostas: true },
    })
    expect(tentativa.veredito).toBe('pendente')
    expect(tentativa.referencia).toBe('Perto do colégio Barjonas')
    expect(tentativa.pessoa.nome).toBe('Maria Silva')
    expect(tentativa.pessoa.telefone).toBe('93991112233')
    expect(tentativa.respostas).toHaveLength(3)
    expect(conferirCodigoEdicao(body.codigoAcompanhamento, tentativa.codigoAcompanhamento)).toBe(true)
  })

  it('recusa reivindicação para caso que não está em estado aberto (409)', async () => {
    const { id } = await publicar()
    await prisma.caso.update({ where: { id }, data: { estado: 'resolvido' } })
    const perguntas = await obterPerguntas(id)

    await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes`)
      .send({
        respostas: perguntas.map((p) => ({ perguntaId: p.id, texto: 'resposta' })),
        pessoa: { nome: 'Maria', telefone: '93991112233' },
      })
      .expect(409)
  })

  it('recusa respostas incompletas ou de perguntas que não pertencem ao caso (400)', async () => {
    const { id } = await publicar()
    const perguntas = await obterPerguntas(id)

    // Faltando uma pergunta
    await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes`)
      .send({
        respostas: [
          { perguntaId: perguntas[0]!.id, texto: 'resp 1' },
          { perguntaId: perguntas[1]!.id, texto: 'resp 2' },
        ],
        pessoa: { nome: 'Maria', telefone: '93991112233' },
      })
      .expect(400)

    // PerguntaId inexistente
    await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes`)
      .send({
        respostas: [
          { perguntaId: perguntas[0]!.id, texto: 'resp 1' },
          { perguntaId: perguntas[1]!.id, texto: 'resp 2' },
          { perguntaId: randomUUID(), texto: 'resp 3' },
        ],
        pessoa: { nome: 'Maria', telefone: '93991112233' },
      })
      .expect(400)
  })

  it('recusa telefone com formato inválido (400)', async () => {
    const { id } = await publicar()
    const perguntas = await obterPerguntas(id)

    await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes`)
      .send({
        respostas: perguntas.map((p) => ({ perguntaId: p.id, texto: 'resp' })),
        pessoa: { nome: 'Maria', telefone: '123' },
      })
      .expect(400)
  })

  it('bloqueia reivindicação quando atinge o limite de 5 pendentes por caso (409)', async () => {
    const { id } = await publicar()
    const perguntas = await obterPerguntas(id)

    for (let i = 1; i <= 5; i++) {
      await request(app.getHttpServer())
        .post(`/casos/${id}/reivindicacoes`)
        .send({
          respostas: perguntas.map((p) => ({ perguntaId: p.id, texto: `resp ${i}` })),
          pessoa: { nome: `Pessoa ${i}`, telefone: `9399111000${i}` },
        })
        .expect(201)
    }

    // A 6ª reivindicação deve receber 409
    await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes`)
      .send({
        respostas: perguntas.map((p) => ({ perguntaId: p.id, texto: 'resp 6' })),
        pessoa: { nome: 'Pessoa 6', telefone: '93991110006' },
      })
      .expect(409)
  })

  it('bloqueia reivindicação de telefone já recusado naquele caso (409)', async () => {
    const { id } = await publicar()
    const perguntas = await obterPerguntas(id)

    const payload = {
      respostas: perguntas.map((p) => ({ perguntaId: p.id, texto: 'resp' })),
      pessoa: { nome: 'Recusado Silva', telefone: '93991119999' },
    }

    const { body } = await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes`)
      .send(payload)
      .expect(201)

    // Simula recusa pelo autor
    await prisma.tentativaVerificacao.update({
      where: { id: body.id },
      data: { veredito: 'recusada' },
    })

    // Tentar de novo com o mesmo telefone no mesmo caso recebe 409
    await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes`)
      .send(payload)
      .expect(409)
  })

  it('vincula caso próprio quando código é válido e tipo é oposto', async () => {
    // Caso 1: perdido
    const perdido = await publicar({ tipo: 'perdido' })
    // Caso 2: encontrado
    const encontrado = await publicar({
      tipo: 'encontrado',
      animal: { ...casoValido().animal, nome: undefined, castrado: undefined },
    })

    const perguntasPerdido = await obterPerguntas(perdido.id)

    // Código inválido dá 403
    await request(app.getHttpServer())
      .post(`/casos/${perdido.id}/reivindicacoes`)
      .send({
        respostas: perguntasPerdido.map((p) => ({ perguntaId: p.id, texto: 'resp' })),
        pessoa: { nome: 'Achei o cão', telefone: '93991238888' },
        casoProprio: { id: encontrado.id, codigoEdicao: 'ERRADO-1234' },
      })
      .expect(403)

    // Mesmo tipo dá 400
    const outroPerdido = await publicar({ tipo: 'perdido' })
    await request(app.getHttpServer())
      .post(`/casos/${perdido.id}/reivindicacoes`)
      .send({
        respostas: perguntasPerdido.map((p) => ({ perguntaId: p.id, texto: 'resp' })),
        pessoa: { nome: 'Achei o cão', telefone: '93991238888' },
        casoProprio: { id: outroPerdido.id, codigoEdicao: outroPerdido.codigoEdicao },
      })
      .expect(400)

    // Caso próprio válido
    const { body } = await request(app.getHttpServer())
      .post(`/casos/${perdido.id}/reivindicacoes`)
      .send({
        respostas: perguntasPerdido.map((p) => ({ perguntaId: p.id, texto: 'resp' })),
        pessoa: { nome: 'Achei o cão', telefone: '93991238888' },
        casoProprio: { id: encontrado.id, codigoEdicao: encontrado.codigoEdicao },
      })
      .expect(201)

    const tentativa = await prisma.tentativaVerificacao.findUniqueOrThrow({
      where: { id: body.id },
    })
    expect(tentativa.casoProprioId).toBe(encontrado.id)
  })
})
