import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validarNomeBancoCarga } from './validar-nome-banco-carga'

describe('guarda do banco de carga', () => {
  it('aceita banco com prefixo de carga', () => {
    expect(() => validarNomeBancoCarga('achei_carga_d')).not.toThrow()
  })

  it('recusa banco fora do prefixo de carga', () => {
    expect(() => validarNomeBancoCarga('achei_teste_d')).toThrow(/NOME_BANCO.*achei_carga/)
  })

  it('executa a guarda antes de qualquer remoção de banco', () => {
    const script = readFileSync(resolve(process.cwd(), 'carga/semear-carga.ts'), 'utf-8')
    const validacao = script.indexOf('validarNomeBancoCarga(NOME_BANCO)')
    const remocao = script.indexOf('DROP DATABASE')

    expect(validacao).toBeGreaterThanOrEqual(0)
    expect(validacao).toBeLessThan(remocao)
  })
})
