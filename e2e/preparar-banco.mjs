import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = process.env.DATABASE_URL_BASE ?? 'postgresql://bicho:bicho@localhost:5432'
export const NOME_BANCO_E2E = process.env.NOME_BANCO_E2E ?? 'achei_e2e'
export const URL_BANCO_ADMIN = `${BASE}/achei_um_bicho`
export const URL_BANCO_E2E = `${BASE}/${NOME_BANCO_E2E}`

export async function prepararBancoE2E() {
  const admin = new PrismaClient({ datasourceUrl: URL_BANCO_ADMIN })
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${NOME_BANCO_E2E} WITH (FORCE)`)
    await admin.$executeRawUnsafe(`CREATE DATABASE ${NOME_BANCO_E2E}`)
  } finally {
    await admin.$disconnect()
  }

  const pastaApi = path.resolve(__dirname, '../apps/api')
  execSync('npx prisma migrate deploy', {
    cwd: pastaApi,
    env: { ...process.env, DATABASE_URL: URL_BANCO_E2E },
    stdio: 'inherit',
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await prepararBancoE2E()
}
