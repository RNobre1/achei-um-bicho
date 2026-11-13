import { PrismaClient } from '@prisma/client'
import { NOME_BANCO_E2E, URL_BANCO_ADMIN } from './global-setup'
import { desconectarPrismaE2E } from './limpar-banco'

export default async function globalTeardown(): Promise<void> {
  await desconectarPrismaE2E()

  const admin = new PrismaClient({ datasourceUrl: URL_BANCO_ADMIN })
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${NOME_BANCO_E2E} WITH (FORCE)`)
  } catch {
    // ignora se o banco já foi apagado
  } finally {
    await admin.$disconnect()
  }
}
