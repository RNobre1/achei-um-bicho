import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { gerarDocumentoVocabulario } from './documentacao'

const CAMINHO_DOC = resolve(__dirname, '../../../docs/vocabulario.md')

describe('docs/vocabulario.md', () => {
  it('está igual ao que o manifesto gera hoje', () => {
    const emDisco = readFileSync(CAMINHO_DOC, 'utf-8')
    expect(emDisco, 'rode: pnpm --filter @achei/contratos gerar:docs').toBe(
      gerarDocumentoVocabulario(),
    )
  })

  it('traz uma seção para cada conjunto, com todos os valores', () => {
    const doc = gerarDocumentoVocabulario()
    expect(doc).toContain('## Espécie do animal (`especie`)')
    expect(doc).toContain('| `nao_observado` | Não deu para ver |')
    expect(doc).toContain('| `abrigado_temporariamente` | Abrigado por alguém |')
  })
})
