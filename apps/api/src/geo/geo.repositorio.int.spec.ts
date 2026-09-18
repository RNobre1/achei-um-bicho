import { Prisma } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { limparBanco } from '../../test/limpar-banco'
import { aoSul, CENTRO_SANTAREM } from '../../test/pontos'
import { PrismaService } from '../prisma/prisma.service'
import { GeoRepositorio, sqlLocaisNoRaio } from './geo.repositorio'

describe('consulta por raio no PostGIS', () => {
  const prisma = new PrismaService()
  const geo = new GeoRepositorio(prisma)

  beforeEach(async () => {
    await limparBanco(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  async function semearTresLocais() {
    const perto = await geo.inserirLocal({ ponto: aoSul(CENTRO_SANTAREM, 500), bairro: 'Aparecida' })
    const medio = await geo.inserirLocal({ ponto: aoSul(CENTRO_SANTAREM, 1500), bairro: 'Santa Clara' })
    const longe = await geo.inserirLocal({ ponto: aoSul(CENTRO_SANTAREM, 3000), bairro: 'Diamantino' })
    return { perto, medio, longe }
  }

  it('traz só o que está dentro do raio, do mais perto para o mais longe', async () => {
    const { perto, medio } = await semearTresLocais()

    const achados = await geo.locaisNoRaio(CENTRO_SANTAREM, 1600)

    expect(achados.map((a) => a.localId)).toEqual([perto, medio])
    expect(achados[0]?.distanciaM).toBeCloseTo(500, -1)
    expect(achados[1]?.distanciaM).toBeCloseTo(1500, -1)
  })

  it('amplia o alcance quando o raio aumenta', async () => {
    await semearTresLocais()
    expect(await geo.locaisNoRaio(CENTRO_SANTAREM, 5000)).toHaveLength(3)
  })

  it('usa o índice espacial, e não varre a tabela inteira', async () => {
    await semearTresLocais()
    const plano = await prisma.$transaction(async (tx) => {
      // com três linhas o planejador preferiria varrer; desligar a varredura
      // mostra se o índice é de fato utilizável pela consulta do mural
      await tx.$executeRaw`SET LOCAL enable_seqscan = off`
      return tx.$queryRaw<{ 'QUERY PLAN': string }[]>(
        Prisma.sql`EXPLAIN ${sqlLocaisNoRaio(CENTRO_SANTAREM, 1600)}`,
      )
    })
    const texto = plano.map((linha) => linha['QUERY PLAN']).join('\n')
    expect(texto).toContain('idx_local_ponto')
  })
})
