import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'

describe('GET /casos/:id/perguntas', () => {
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

  it('lista as três perguntas do caso por ordem, sem a resposta esperada', async () => {
    const id = await publicar()

    const { body } = await request(app.getHttpServer()).get(`/casos/${id}/perguntas`).expect(200)

    expect(body).toHaveLength(3)
    expect(body).toEqual([
      { id: expect.any(String), ordem: 1, enunciado: 'Qual sinal ele tem que não aparece na foto?' },
      { id: expect.any(String), ordem: 2, enunciado: 'Que nome ele atende?' },
      { id: expect.any(String), ordem: 3, enunciado: 'O que ele usava quando sumiu?' },
    ])
    expect(JSON.stringify(body)).not.toContain('respostaEsperada')
    expect(JSON.stringify(body)).not.toContain('orelha esquerda')
    expect(JSON.stringify(body)).not.toContain('Coleira vermelha')
  })

  it('responde 404 para caso que não existe', async () => {
    await request(app.getHttpServer()).get(`/casos/${randomUUID()}/perguntas`).expect(404)
  })

  it('responde 400 para identificador que não é uuid', async () => {
    await request(app.getHttpServer()).get('/casos/invalido/perguntas').expect(400)
  })
})
