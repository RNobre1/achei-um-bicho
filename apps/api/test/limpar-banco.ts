import type { PrismaClient } from '@prisma/client'

/** Esvazia as tabelas do domínio entre um teste e outro, preservando as do sistema. */
export async function limparBanco(prisma: PrismaClient): Promise<void> {
  const tabelas = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename NOT IN ('_prisma_migrations', 'spatial_ref_sys')`
  if (tabelas.length === 0) return
  const lista = tabelas.map((t) => `"${t.tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE ${lista} CASCADE`)
}
