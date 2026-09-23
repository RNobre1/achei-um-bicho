import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'

describe('POST /casos recusa publicação inválida', () => {
  let app: INestApplication
  const prisma = new PrismaClient()
  const pergunta = { enunciado: 'Qual o nome?', respostaEsperada: 'Nego' }

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

  const invalidos: [string, Record<string, unknown>][] = [
    ['espécie fora do vocabulário', { animal: { ...casoValido().animal, especie: 'papagaio' } }],
    ['cor fora do vocabulário', { animal: { ...casoValido().animal, corDominante: 'roxo' } }],
    ['só duas perguntas de verificação', { perguntas: [pergunta, pergunta] }],
    ['quatro perguntas de verificação', { perguntas: [pergunta, pergunta, pergunta, pergunta] }],
    ['latitude impossível', { local: { ...casoValido().local, latitude: 91 } }],
    ['autor sem nome', { autor: { telefone: '93991234567' } }],
    ['data que não é data', { ocorridoEm: 'sábado passado' }],
    ['data no futuro', { ocorridoEm: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() }],
    ['estado escolhido pelo cliente', { estado: 'resolvido' }],
  ]

  it.each(invalidos)('recusa %s, sem gravar nada', async (_motivo, alteracao) => {
    await request(app.getHttpServer()).post('/casos').send(casoValido(alteracao)).expect(400)
    expect(await prisma.caso.count()).toBe(0)
  })

  it('aceita a hora do celular um pouco adiantada', async () => {
    const adiantado = new Date(Date.now() + 2 * 60 * 1000).toISOString()
    await request(app.getHttpServer()).post('/casos').send(casoValido({ ocorridoEm: adiantado })).expect(201)
  })
})
