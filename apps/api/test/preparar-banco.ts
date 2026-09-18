import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import { NOME_BANCO_TESTE, URL_BANCO_ADMIN, URL_BANCO_TESTE } from './banco-teste'

/** Recria o banco de teste e aplica todas as migrações, como aconteceria em produção. */
export default async function prepararBanco(): Promise<void> {
  const admin = new PrismaClient({ datasourceUrl: URL_BANCO_ADMIN })
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${NOME_BANCO_TESTE} WITH (FORCE)`)
  await admin.$executeRawUnsafe(`CREATE DATABASE ${NOME_BANCO_TESTE}`)
  await admin.$disconnect()

  execSync('npx prisma migrate deploy', {
    cwd: `${__dirname}/..`,
    env: { ...process.env, DATABASE_URL: URL_BANCO_TESTE },
    stdio: 'pipe',
  })
}
