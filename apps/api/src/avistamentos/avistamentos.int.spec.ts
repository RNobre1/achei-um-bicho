import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'
import { aoSul, CENTRO_SANTAREM } from '../../test/pontos'

const UMA_HORA = 60 * 60 * 1000

function avistamentoValido(sobrescrever: Record<string, unknown> = {}) {
  const ponto = aoSul(CENTRO_SANTAREM, 400)
  return {
    latitude: ponto.latitude,
    longitude: ponto.longitude,
    bairro: 'Santa Clara',
    vistoEm: new Date(Date.now() - UMA_HORA).toISOString(),
    observacao: 'Estava perto da padaria, mancando um pouco.',
    ...sobrescrever,
  }
}

describe('avistamentos de um caso', () => {
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

  async function publicar(): Promise<{ id: string; codigoEdicao: string }> {
    const { body } = await request(app.getHttpServer()).post('/casos').send(casoValido()).expect(201)
    return body
  }

  function avisar(casoId: string, corpo: Record<string, unknown> = avistamentoValido()) {
    return request(app.getHttpServer()).post(`/casos/${casoId}/avistamentos`).send(corpo)
  }

  describe('POST /casos/:id/avistamentos', () => {
    it('registra o avistamento sem pedir conta', async () => {
      const { id } = await publicar()
      const corpo = avistamentoValido()

      const { body } = await avisar(id, corpo).expect(201)

      expect(body).toEqual({ id: expect.any(String), vistoEm: corpo.vistoEm })
      const gravado = await prisma.avistamento.findUniqueOrThrow({ where: { id: body.id } })
      expect(gravado).toMatchObject({ casoId: id, pessoaId: null, observacao: corpo.observacao })
    })

    it('conta como interação no caso, o que adia a cobrança e a expiração', async () => {
      const { id } = await publicar()
      await prisma.$executeRaw`UPDATE caso SET ultima_interacao_em = now() - interval '8 days' WHERE id = ${id}::uuid`

      await avisar(id).expect(201)

      const caso = await prisma.caso.findUniqueOrThrow({ where: { id } })
      expect(Date.now() - caso.ultimaInteracaoEm.getTime()).toBeLessThan(60_000)
    })

    it('responde 404 para caso que não existe', async () => {
      await avisar(randomUUID()).expect(404)
    })

    it('responde 409 para caso que já saiu do mural', async () => {
      const { id } = await publicar()
      await prisma.caso.update({ where: { id }, data: { estado: 'resolvido' } })

      await avisar(id).expect(409)
    })

    it.each([
      ['sem local', { latitude: undefined }],
      ['com data no futuro', { vistoEm: new Date(Date.now() + 2 * UMA_HORA).toISOString() }],
      ['com observação longa demais', { observacao: 'x'.repeat(501) }],
      ['com campo que a API não conhece', { telefone: '93990000000' }],
    ])('recusa avistamento %s', async (_caso, sobrescrever) => {
      const { id } = await publicar()
      await avisar(id, avistamentoValido(sobrescrever)).expect(400)
      expect(await prisma.avistamento.count()).toBe(0)
    })
  })

  describe('GET /casos/:id/avistamentos', () => {
    it('mostra a quem publicou os avistamentos, do mais recente ao mais antigo', async () => {
      const { id, codigoEdicao } = await publicar()
      await avisar(id, avistamentoValido({ observacao: 'primeiro', vistoEm: new Date(Date.now() - 3 * UMA_HORA).toISOString() })).expect(201)
      await avisar(id, avistamentoValido({ observacao: 'segundo' })).expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/casos/${id}/avistamentos`)
        .set('x-codigo-edicao', codigoEdicao)
        .expect(200)

      expect(body.map((a: { observacao: string }) => a.observacao)).toEqual(['segundo', 'primeiro'])
      expect(body[0]).toEqual({
        id: expect.any(String),
        vistoEm: expect.any(String),
        registradoEm: expect.any(String),
        observacao: 'segundo',
        bairro: 'Santa Clara',
        distanciaM: expect.any(Number),
      })
      expect(body[0].distanciaM).toBeGreaterThanOrEqual(395)
      expect(body[0].distanciaM).toBeLessThanOrEqual(405)
    })

    it('aceita o código digitado em minúscula e sem hífen', async () => {
      const { id, codigoEdicao } = await publicar()
      await request(app.getHttpServer())
        .get(`/casos/${id}/avistamentos`)
        .set('x-codigo-edicao', codigoEdicao.toLowerCase().replace('-', ''))
        .expect(200)
    })

    it('recusa quem não mostra o código de edição do caso', async () => {
      const { id } = await publicar()
      const outro = await publicar()
      await request(app.getHttpServer()).get(`/casos/${id}/avistamentos`).expect(403)
      await request(app.getHttpServer())
        .get(`/casos/${id}/avistamentos`)
        .set('x-codigo-edicao', outro.codigoEdicao)
        .expect(403)
    })

    it('responde 404 para caso que não existe', async () => {
      await request(app.getHttpServer())
        .get(`/casos/${randomUUID()}/avistamentos`)
        .set('x-codigo-edicao', 'ABCD-EFGH')
        .expect(404)
    })
  })
})
