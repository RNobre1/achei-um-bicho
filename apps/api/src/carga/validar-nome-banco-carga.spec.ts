import { describe, expect, it } from 'vitest'
import { validarNomeBancoCarga } from './validar-nome-banco-carga'

describe('guarda do banco de carga', () => {
  it('aceita banco com prefixo de carga', () => {
    expect(() => validarNomeBancoCarga('achei_carga_d')).not.toThrow()
  })

  it('recusa banco fora do prefixo de carga', () => {
    expect(() => validarNomeBancoCarga('achei_teste_d')).toThrow(/NOME_BANCO.*achei_carga/)
  })
})
