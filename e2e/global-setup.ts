import { limparBancoE2E } from './limpar-banco'

const BASE = process.env.DATABASE_URL_BASE ?? 'postgresql://bicho:bicho@localhost:5432'
export const NOME_BANCO_E2E = process.env.NOME_BANCO_E2E ?? 'achei_e2e'
export const URL_BANCO_ADMIN = `${BASE}/achei_um_bicho`
export const URL_BANCO_E2E = `${BASE}/${NOME_BANCO_E2E}`

export default async function globalSetup(): Promise<void> {
  await limparBancoE2E()
}
