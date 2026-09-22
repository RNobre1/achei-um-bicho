import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'
import { hashCodigoEdicao } from './codigo-edicao'

describe('POST /casos', () => {
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

  it('publica o caso de quem perdeu, que nasce procurando', async () => {
    const resposta = await request(app.getHttpServer()).post('/casos').send(casoValido()).expect(201)

    expect(resposta.body).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      tipo: 'perdido',
      estado: 'procurando',
      codigoEdicao: expect.stringMatching(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/),
    })
  })

  it('grava o animal, o lugar, quem publicou e as três perguntas', async () => {
    const { body } = await request(app.getHttpServer()).post('/casos').send(casoValido()).expect(201)

    const caso = await prisma.caso.findUniqueOrThrow({
      where: { id: body.id },
      include: { animal: true, autor: true, perguntas: { orderBy: { ordem: 'asc' } } },
    })
    expect(caso.animal).toMatchObject({ especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'com', nome: 'Nego' })
    expect(caso.autor).toMatchObject({ nome: 'Tutor do Nego', telefone: '93991234567', email: null })
    expect(caso.perguntas.map((p) => [p.ordem, p.respostaEsperada])).toEqual([
      [1, 'Falta um pedaço da orelha esquerda'],
      [2, 'Nego'],
      [3, 'Coleira vermelha de nylon'],
    ])

    const [local] = await prisma.$queryRaw<{ bairro: string; latitude: number; longitude: number }[]>`
      SELECT bairro, ST_Y(ponto::geometry) AS latitude, ST_X(ponto::geometry) AS longitude
        FROM local WHERE id = ${caso.localId}::uuid`
    expect(local).toEqual({ bairro: 'Aparecida', latitude: -2.4385, longitude: -54.7085 })
  })

  it('publica o caso de quem achou sem pedir conta, e ele nasce abrigado', async () => {
    const corpo = casoValido({ tipo: 'encontrado', autor: { nome: 'Quem achou' } })
    const { body } = await request(app.getHttpServer()).post('/casos').send(corpo).expect(201)

    expect(body.estado).toBe('abrigado_temporariamente')
    const caso = await prisma.caso.findUniqueOrThrow({ where: { id: body.id }, include: { autor: true } })
    expect(caso.autor).toMatchObject({ email: null, senhaHash: null, telefone: null })
  })

  it('guarda só o hash do código de edição, nunca o código', async () => {
    const { body } = await request(app.getHttpServer()).post('/casos').send(casoValido()).expect(201)

    const caso = await prisma.caso.findUniqueOrThrow({ where: { id: body.id } })
    expect(caso.codigoEdicao).toBe(hashCodigoEdicao(body.codigoEdicao))
    expect(caso.codigoEdicao).not.toContain(body.codigoEdicao.replace('-', ''))
  })
})
