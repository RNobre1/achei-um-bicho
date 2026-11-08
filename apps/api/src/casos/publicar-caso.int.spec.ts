import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'
import { CasosService } from './casos.service'
import { CasosRepositorio } from './casos.repositorio'
import { GeradorDePareamentos } from '../pareamento/gerador-de-pareamentos'
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

describe('POST /casos com publicação idempotente (F9)', () => {
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

  const idCliente = 'a1b2c3d4-e5f6-4a1b-8c2d-123456789abc'
  const codigoEdicao = '2345-6789'

  it('grava o idCliente e o hash do código quando informados pelo aparelho', async () => {
    const corpo = casoValido({ idCliente, codigoEdicao })
    const { body } = await request(app.getHttpServer()).post('/casos').send(corpo).expect(201)

    expect(body.codigoEdicao).toBe(codigoEdicao)
    const caso = await prisma.caso.findUniqueOrThrow({ where: { id: body.id } })
    expect(caso.idCliente).toBe(idCliente)
    expect(caso.codigoEdicao).toBe(hashCodigoEdicao(codigoEdicao))
  })

  it('devolve o mesmo caso quando reenviado com o mesmo idCliente e código, sem criar outro', async () => {
    const corpo = casoValido({ idCliente, codigoEdicao })
    const primeira = await request(app.getHttpServer()).post('/casos').send(corpo).expect(201)
    const segunda = await request(app.getHttpServer()).post('/casos').send(corpo)

    expect(segunda.status).toBe(201)
    expect(segunda.body).toEqual(primeira.body)
    expect(await prisma.caso.count()).toBe(1)
  })

  it('recusa com 409 quando o mesmo idCliente é enviado com outro código de edição', async () => {
    const primeiro = casoValido({ idCliente, codigoEdicao })
    await request(app.getHttpServer()).post('/casos').send(primeiro).expect(201)

    const outroCodigo = 'ABCD-EFGH'
    const segundo = casoValido({ idCliente, codigoEdicao: outroCodigo })
    const resposta = await request(app.getHttpServer()).post('/casos').send(segundo)

    expect(resposta.status).toBe(409)
    expect(await prisma.caso.count()).toBe(1)
  })
  it("trata corrida com dois POSTs simultâneos para o mesmo idCliente", async () => {
    const corpo = casoValido({ idCliente, codigoEdicao })
    const [res1, res2] = await Promise.all([
      request(app.getHttpServer()).post("/casos").send(corpo),
      request(app.getHttpServer()).post("/casos").send(corpo),
    ])

    expect(res1.status).toBe(201)
    expect(res2.status).toBe(201)
    expect(res1.body.id).toBe(res2.body.id)
    expect(res1.body.codigoEdicao).toBe(codigoEdicao)
    expect(await prisma.caso.count()).toBe(1)
  })
  it("recupera de erro P2002 em corrida relendo por idCliente", async () => {
    const corpo = casoValido({ idCliente, codigoEdicao })
    const primeira = await request(app.getHttpServer()).post("/casos").send(corpo).expect(201)

    const service = app.get(CasosService)
    const repositorio = app.get(CasosRepositorio)
    vi.spyOn(repositorio, "buscarPorIdCliente")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: primeira.body.id,
        tipo: "perdido",
        estado: "procurando",
        codigoEdicao: hashCodigoEdicao(codigoEdicao),
      })
    vi.spyOn(repositorio, "criar").mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.0.0",
      })
    )

    const resultado = await service.publicar(corpo as any)
    expect(resultado.id).toBe(primeira.body.id)
    expect(resultado.codigoEdicao).toBe(codigoEdicao)
  })

  it('não trata P2002 do gerador de pareamentos como colisão do idCliente', async () => {
    const service = app.get(CasosService)
    const gerador = app.get(GeradorDePareamentos)
    const erro = new Prisma.PrismaClientKnownRequestError('Erro do gerador', {
      code: 'P2002',
      clientVersion: '5.0.0',
    })
    vi.spyOn(gerador, 'gerarPara').mockRejectedValueOnce(erro)

    await expect(service.publicar(casoValido({ idCliente, codigoEdicao }) as any)).rejects.toBe(erro)
  })
})
