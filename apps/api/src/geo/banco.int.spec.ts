import { PrismaClient } from '@prisma/client'
import { afterAll, describe, expect, it } from 'vitest'

describe('estrutura do banco depois das migrações', () => {
  const prisma = new PrismaClient()

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('tem a extensão PostGIS instalada', async () => {
    const linhas = await prisma.$queryRaw<{ extname: string }[]>`
      SELECT extname FROM pg_extension WHERE extname = 'postgis'`
    expect(linhas).toHaveLength(1)
  })

  it('guarda o ponto do local como geography, não como dois números soltos', async () => {
    const linhas = await prisma.$queryRaw<{ udt_name: string }[]>`
      SELECT udt_name FROM information_schema.columns
       WHERE table_name = 'local' AND column_name = 'ponto'`
    expect(linhas[0]?.udt_name).toBe('geography')
  })

  it('tem índice espacial GIST sobre local.ponto', async () => {
    const linhas = await prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_local_ponto'`
    expect(linhas[0]?.indexdef).toMatch(/USING gist/i)
  })
})
