import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  COLUNAS_COM_VOCABULARIO,
  MARCA_MIGRACAO_GERADA,
  gerarSqlVocabulario,
} from './vocabulario-no-banco'

const PASTA_MIGRACOES = resolve(__dirname, '../../prisma/migrations')

function migracoes(): { nome: string; sql: string }[] {
  return readdirSync(PASTA_MIGRACOES, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((nome) => ({ nome, sql: readFileSync(join(PASTA_MIGRACOES, nome, 'migration.sql'), 'utf-8') }))
}

describe('vocabulário fechado no banco', () => {
  it('a migração de vocabulário mais recente é exatamente o que o manifesto gera hoje', () => {
    const geradas = migracoes().filter((m) => m.sql.startsWith(MARCA_MIGRACAO_GERADA))
    const ultima = geradas.at(-1)
    expect(ultima, 'rode: pnpm --filter @achei/api gerar:vocabulario').toBeDefined()
    expect(ultima?.sql, 'rode: pnpm --filter @achei/api gerar:vocabulario').toBe(gerarSqlVocabulario())
  })

  it('nenhuma migração escrita à mão traz CHECK com lista literal de valores', () => {
    // a regra vale para qualquer migração, inclusive as que ainda não existem
    const escritasAMao = migracoes().filter((m) => !m.sql.startsWith(MARCA_MIGRACAO_GERADA))
    for (const { nome, sql } of escritasAMao) {
      expect(sql, `${nome} tem CHECK com valores soltos`).not.toMatch(/CHECK\s*\([^)]*\bIN\s*\(/i)
    }
  })

  it('cada coluna mapeada existe no banco criado pelas migrações', () => {
    const tudo = migracoes().map((m) => m.sql).join('\n')
    for (const { tabela, coluna } of COLUNAS_COM_VOCABULARIO) {
      const criacao = new RegExp(`CREATE TABLE "${tabela}" \\(([\\s\\S]*?)\\);`).exec(tudo)?.[1]
      expect(criacao, `tabela ${tabela}`).toBeDefined()
      expect(criacao, `${tabela}.${coluna}`).toContain(`"${coluna}"`)
    }
  })

  it('gera uma restrição por coluna, com os valores na ordem do manifesto', () => {
    const sql = gerarSqlVocabulario()
    expect(sql).toContain(
      `ALTER TABLE "animal" ADD CONSTRAINT "ck_animal_porte" CHECK ("porte" IN ('pequeno', 'medio', 'grande'));`,
    )
    expect(sql.match(/ADD CONSTRAINT/g)).toHaveLength(COLUNAS_COM_VOCABULARIO.length)
  })
})
