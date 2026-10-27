import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'

describe('F8 ciclo de vida: situação do caso', () => {
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

  describe('GET /casos/:id/situacao', () => {
    it('retorna a situação completa do caso para o autor', async () => {
      const { id, codigoEdicao } = await publicar()

      const { body } = await request(app.getHttpServer())
        .get(`/casos/${id}/situacao`)
        .set('x-codigo-edicao', codigoEdicao)
        .expect(200)

      expect(body).toEqual({
        id,
        estado: 'procurando',
        cobrancaPendente: false,
        diasSemInteracao: 0,
        reivindicacoesPendentes: 0,
        desfecho: null,
      })
    })

    it('indica cobrança pendente quando cobrado_em está preenchido ou sem interação há tempo', async () => {
      const { id, codigoEdicao } = await publicar()
      await prisma.$executeRaw`UPDATE caso SET cobrado_em = now(), ultima_interacao_em = now() - interval '9 days' WHERE id = ${id}::uuid`

      const { body } = await request(app.getHttpServer())
        .get(`/casos/${id}/situacao`)
        .set('x-codigo-edicao', codigoEdicao)
        .expect(200)

      expect(body.cobrancaPendente).toBe(true)
      expect(body.diasSemInteracao).toBe(9)
    })

    it('conta reivindicações pendentes', async () => {
      const { id, codigoEdicao } = await publicar()
      const pessoa = await prisma.pessoa.create({ data: { nome: 'Reivindicante', telefone: '93991112222' } })
      await prisma.tentativaVerificacao.create({
        data: {
          casoId: id,
          pessoaId: pessoa.id,
          codigoAcompanhamento: 'hash-1',
          veredito: 'pendente',
        },
      })

      const { body } = await request(app.getHttpServer())
        .get(`/casos/${id}/situacao`)
        .set('x-codigo-edicao', codigoEdicao)
        .expect(200)

      expect(body.reivindicacoesPendentes).toBe(1)
    })

    it('recusa sem o código de edição correto (403)', async () => {
      const { id } = await publicar()
      await request(app.getHttpServer()).get(`/casos/${id}/situacao`).expect(403)
      await request(app.getHttpServer())
        .get(`/casos/${id}/situacao`)
        .set('x-codigo-edicao', 'ERRADO-123')
        .expect(403)
    })

    it('responde 404 para caso inexistente', async () => {
      await request(app.getHttpServer())
        .get(`/casos/${randomUUID()}/situacao`)
        .set('x-codigo-edicao', 'ABCD-EFGH')
        .expect(404)
    })
  })
})
