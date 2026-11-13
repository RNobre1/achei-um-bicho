import { PrismaClient } from '@prisma/client'
import { URL_BANCO_E2E } from './global-setup'

let prismaE2E: PrismaClient | undefined

export function obterPrismaE2E(): PrismaClient {
  if (!prismaE2E) {
    prismaE2E = new PrismaClient({ datasourceUrl: URL_BANCO_E2E })
  }
  return prismaE2E
}

/** Esvazia todas as tabelas do domínio antes de cada especificação isolada. */
export async function limparBancoE2E(): Promise<void> {
  const prisma = obterPrismaE2E()
  const tabelas = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename NOT IN ('_prisma_migrations', 'spatial_ref_sys')`
  if (tabelas.length === 0) return
  const lista = tabelas.map((t) => `"${t.tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE ${lista} CASCADE`)
}

export async function desconectarPrismaE2E(): Promise<void> {
  if (prismaE2E) {
    await prismaE2E.$disconnect()
    prismaE2E = undefined
  }
}
