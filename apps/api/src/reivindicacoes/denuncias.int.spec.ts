import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'

describe('POST /casos/:id/denuncias', () => {
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

  async function publicar(): Promise<string> {
    const { body } = await request(app.getHttpServer()).post('/casos').send(casoValido()).expect(201)
    return body.id
  }

  async function criarReivindicacao(casoId: string) {
    const { body: perguntas } = await request(app.getHttpServer()).get(`/casos/${casoId}/perguntas`).expect(200)
    const { body } = await request(app.getHttpServer())
      .post(`/casos/${casoId}/reivindicacoes`)
      .send({
        respostas: perguntas.map((p: { id: string }) => ({ perguntaId: p.id, texto: 'resp' })),
        pessoa: { nome: 'Pessoa', telefone: '93991112233' },
      })
      .expect(201)
    return body.id as string
  }

  it('registra denúncia sem código de edição e sem reivindicação associada', async () => {
    const id = await publicar()

    const { body } = await request(app.getHttpServer())
      .post(`/casos/${id}/denuncias`)
      .send({
        motivo: 'pediu_dinheiro',
        texto: 'A pessoa exigiu PIX de 200 reais para devolver o animal.',
      })
      .expect(201)

    expect(body).toEqual({ id: expect.any(String) })

    const salva = await prisma.denuncia.findUniqueOrThrow({ where: { id: body.id } })
    expect(salva.casoId).toBe(id)
    expect(salva.tentativaId).toBeNull()
    expect(salva.motivo).toBe('pediu_dinheiro')
    expect(salva.texto).toBe('A pessoa exigiu PIX de 200 reais para devolver o animal.')
  })

  it('registra denúncia associada a uma reivindicação do caso', async () => {
    const id = await publicar()
    const rid = await criarReivindicacao(id)

    const { body } = await request(app.getHttpServer())
      .post(`/casos/${id}/denuncias`)
      .send({
        motivo: 'respostas_suspeitas',
        reivindicacaoId: rid,
        texto: 'Errou todos os sinais do bicho',
      })
      .expect(201)

    const salva = await prisma.denuncia.findUniqueOrThrow({ where: { id: body.id } })
    expect(salva.casoId).toBe(id)
    expect(salva.tentativaId).toBe(rid)
  })

  it('recusa denúncia quando reivindicacaoId pertence a outro caso (400)', async () => {
    const caso1 = await publicar()
    const caso2 = await publicar()
    const ridDoCaso2 = await criarReivindicacao(caso2)

    await request(app.getHttpServer())
      .post(`/casos/${caso1}/denuncias`)
      .send({
        motivo: 'outro',
        reivindicacaoId: ridDoCaso2,
      })
      .expect(400)
  })

  it('recusa motivo fora do vocabulário ou texto maior que 500 caracteres (400)', async () => {
    const id = await publicar()

    await request(app.getHttpServer())
      .post(`/casos/${id}/denuncias`)
      .send({ motivo: 'invalido' })
      .expect(400)

    await request(app.getHttpServer())
      .post(`/casos/${id}/denuncias`)
      .send({
        motivo: 'outro',
        texto: 'a'.repeat(501),
      })
      .expect(400)
  })

  it('responde 404 para caso que não existe', async () => {
    await request(app.getHttpServer())
      .post(`/casos/${randomUUID()}/denuncias`)
      .send({ motivo: 'outro' })
      .expect(404)
  })
})
