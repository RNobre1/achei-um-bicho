import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'
import { aoSul, CENTRO_SANTAREM } from '../../test/pontos'

const UM_DIA = 24 * 60 * 60 * 1000

/** Caso perdido no centro, sumido há dois dias: cachorro médio, caramelo, com coleira. */
function perdido(sobrescrever: Record<string, unknown> = {}) {
  return casoValido({ ocorridoEm: new Date(Date.now() - 2 * UM_DIA).toISOString(), ...sobrescrever })
}

/** Caso encontrado a tantos metros ao sul do centro, achado ontem. */
function encontrado(metros: number, animal: Record<string, unknown> = {}, sobrescrever: Record<string, unknown> = {}) {
  const base = casoValido()
  return casoValido({
    tipo: 'encontrado',
    animal: { ...base.animal, nome: undefined, castrado: undefined, ...animal },
    local: { ...base.local, ...aoSul(CENTRO_SANTAREM, metros), bairro: 'Santa Clara' },
    ocorridoEm: new Date(Date.now() - UM_DIA).toISOString(),
    ...sobrescrever,
  })
}

describe('gerador de pareamentos, disparado na publicação', () => {
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

  async function publicar(corpo: Record<string, unknown>): Promise<string> {
    const { body } = await request(app.getHttpServer()).post('/casos').send(corpo).expect(201)
    return body.id
  }

  it('publicar um achado perto de um perdido parecido cria o par, com o que bateu e o que não bateu', async () => {
    const idPerdido = await publicar(perdido())
    const idEncontrado = await publicar(encontrado(850, { coleira: 'sem' }))

    const pares = await prisma.pareamento.findMany()

    expect(pares).toHaveLength(1)
    expect(pares[0]).toMatchObject({
      casoPerdidoId: idPerdido,
      casoEncontradoId: idEncontrado,
      veredito: 'pendente',
      diasDiferenca: 1,
    })
    expect(pares[0]!.distanciaM).toBeGreaterThanOrEqual(845)
    expect(pares[0]!.distanciaM).toBeLessThanOrEqual(855)
    expect(pares[0]!.atributosBatem).toEqual([
      { atributo: 'porte', perdido: 'medio', encontrado: 'medio' },
      { atributo: 'cor', perdido: 'caramelo', encontrado: 'caramelo' },
      { atributo: 'distancia', metros: pares[0]!.distanciaM },
      { atributo: 'tempo', dias: 1 },
    ])
    expect(pares[0]!.atributosDivergem).toEqual([{ atributo: 'coleira', perdido: 'com', encontrado: 'sem' }])
  })

  it('funciona nos dois sentidos: o perdido publicado depois também encontra o achado', async () => {
    const idEncontrado = await publicar(encontrado(400))
    const idPerdido = await publicar(perdido())

    const [par] = await prisma.pareamento.findMany()
    expect(par).toMatchObject({ casoPerdidoId: idPerdido, casoEncontradoId: idEncontrado })
  })

  it('um caso novo vira par com cada candidato que passar no filtro', async () => {
    await publicar(encontrado(400))
    await publicar(encontrado(2500, { corDominante: 'malhado' }))
    await publicar(perdido())

    expect(await prisma.pareamento.count()).toBe(2)
  })

  it('não junta espécies diferentes', async () => {
    await publicar(perdido())
    await publicar(encontrado(400, { especie: 'gato' }))
    expect(await prisma.pareamento.count()).toBe(0)
  })

  it('não junta dois casos do mesmo lado', async () => {
    await publicar(perdido())
    await publicar(perdido())
    expect(await prisma.pareamento.count()).toBe(0)
  })

  it('não junta casos a mais de 5 km um do outro', async () => {
    await publicar(perdido())
    await publicar(encontrado(5200))
    expect(await prisma.pareamento.count()).toBe(0)
  })

  it('não junta caso que já saiu do mural', async () => {
    const idPerdido = await publicar(perdido())
    await prisma.caso.update({ where: { id: idPerdido }, data: { estado: 'resolvido' } })

    await publicar(encontrado(400))

    expect(await prisma.pareamento.count()).toBe(0)
  })
})
