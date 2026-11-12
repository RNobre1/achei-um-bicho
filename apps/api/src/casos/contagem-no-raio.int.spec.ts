import type { INestApplication } from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'
import { PrismaService } from '../prisma/prisma.service'
import { CasosRepositorio } from './casos.repositorio'

/**
 * O planejador estima poucas linhas para ST_DWithin em geography e escolhe um laço
 * aninhado que compara cada local com cada caso (Join Filter). Com 20.000 casos isso
 * levou 8,8 s por contagem; o plano não pode ter essa forma.
 */
describe('contagem de casos no raio do mural', () => {
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

  it('conta sem laço aninhado com filtro de junção entre local e caso', async () => {
    for (let i = 0; i < 3; i++) await request(app.getHttpServer()).post('/casos').send(casoValido()).expect(201)
    // com estatísticas, como num banco em uso; sem elas o planejador usa estimativas padrão
    await prisma.$executeRawUnsafe('ANALYZE')

    const prismaDaApi = app.get(PrismaService)
    let consulta: Prisma.Sql | undefined
    const espiao = vi.spyOn(prismaDaApi, '$queryRaw').mockImplementationOnce(((
      partes: TemplateStringsArray,
      ...valores: unknown[]
    ) => {
      consulta = Prisma.sql(partes, ...valores)
      return Promise.resolve([{ total: 0 }])
    }) as never)

    await app.get(CasosRepositorio).contarAbertosNoRaio({ latitude: -2.4432, longitude: -54.7123 }, 5000)
    espiao.mockRestore()

    expect(consulta).toBeDefined()
    const plano = await prisma.$queryRawUnsafe(`EXPLAIN (FORMAT JSON) ${consulta!.text}`, ...consulta!.values)
    expect(JSON.stringify(plano)).not.toContain('Join Filter')

    const total = await app.get(CasosRepositorio).contarAbertosNoRaio({ latitude: -2.4432, longitude: -54.7123 }, 5000)
    expect(total).toBe(3)
  })
})
