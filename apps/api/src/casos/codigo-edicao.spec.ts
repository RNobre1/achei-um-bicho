import { describe, expect, it } from 'vitest'
import { conferirCodigoEdicao, gerarCodigoEdicao, hashCodigoEdicao } from './codigo-edicao'

describe('código de edição de quem publica sem conta', () => {
  it('tem o formato XXXX-XXXX, fácil de anotar e de ditar', () => {
    expect(gerarCodigoEdicao()).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
  })

  it('não usa caracteres que se confundem ao ler: 0, O, 1, I, L', () => {
    for (let i = 0; i < 200; i++) {
      expect(gerarCodigoEdicao()).not.toMatch(/[0O1IL]/)
    }
  })

  it('não se repete em quinhentas gerações', () => {
    const codigos = new Set(Array.from({ length: 500 }, () => gerarCodigoEdicao()))
    expect(codigos.size).toBe(500)
  })

  it('vira um hash de 64 caracteres que não revela o código', () => {
    const codigo = gerarCodigoEdicao()
    const hash = hashCodigoEdicao(codigo)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).not.toContain(codigo.replace('-', ''))
  })

  it('dá o mesmo hash para o código digitado em minúscula ou sem o hífen', () => {
    expect(hashCodigoEdicao('abcd-efgh')).toBe(hashCodigoEdicao('ABCDEFGH'))
    expect(hashCodigoEdicao(' ABCD-EFGH ')).toBe(hashCodigoEdicao('ABCD-EFGH'))
  })

  it('confere o código digitado contra o hash guardado', () => {
    const codigo = gerarCodigoEdicao()
    const hash = hashCodigoEdicao(codigo)
    expect(conferirCodigoEdicao(codigo.toLowerCase().replace('-', ''), hash)).toBe(true)
    expect(conferirCodigoEdicao('2345-6789', hash)).toBe(false)
  })

  it('recusa código ausente ou vazio, e caso sem hash guardado', () => {
    const hash = hashCodigoEdicao('ABCD-EFGH')
    expect(conferirCodigoEdicao(undefined, hash)).toBe(false)
    expect(conferirCodigoEdicao('', hash)).toBe(false)
    expect(conferirCodigoEdicao('ABCD-EFGH', null)).toBe(false)
  })
})
