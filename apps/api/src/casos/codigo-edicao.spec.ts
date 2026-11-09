import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { conferirCodigoEdicao, gerarCodigoEdicao, hashCodigoEdicao } from './codigo-edicao'

describe('código de edição de quem publica sem conta', () => {
  const segredoOriginal = process.env.CODIGO_SEGREDO
  const ambienteOriginal = process.env.NODE_ENV

  beforeEach(() => {
    process.env.CODIGO_SEGREDO = 'segredo-de-teste'
    process.env.NODE_ENV = 'test'
  })

  afterEach(() => {
    process.env.CODIGO_SEGREDO = segredoOriginal
    process.env.NODE_ENV = ambienteOriginal
  })

  it('tem o formato XXXX-XXXX, fácil de anotar e de ditar', () => {
    expect(gerarCodigoEdicao()).toMatch(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/)
  })

  it('não usa caracteres que se confundem ao ler: 0, O, 1, I, L', () => {
    for (let i = 0; i < 200; i++) {
      expect(gerarCodigoEdicao()).not.toMatch(/[0O1IL]/)
    }
  })

  it('não se repete em quinhentas gerações', () => {
    const vistos = new Set<string>()
    for (let i = 0; i < 500; i++) {
      vistos.add(gerarCodigoEdicao())
    }
    expect(vistos.size).toBe(500)
  })

  it('vira um hash de 64 caracteres que não revela o código', () => {
    const hash = hashCodigoEdicao('7K9P-2M4X')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).not.toContain('7K9P')
    expect(hash).not.toContain('2M4X')
  })

  it('dá o mesmo hash para o código digitado em minúscula ou sem o hífen', () => {
    const base = hashCodigoEdicao('7K9P-2M4X')
    expect(hashCodigoEdicao('7k9p-2m4x')).toBe(base)
    expect(hashCodigoEdicao('7K9P2M4X')).toBe(base)
    expect(hashCodigoEdicao('  7k9p 2m4x  ')).toBe(base)
  })

  it('confere o código digitado contra o hash guardado', () => {
    const hash = hashCodigoEdicao('7K9P-2M4X')
    expect(conferirCodigoEdicao('7K9P-2M4X', hash)).toBe(true)
    expect(conferirCodigoEdicao('7k9p-2m4x', hash)).toBe(true)
    expect(conferirCodigoEdicao('7K9P2M4X', hash)).toBe(true)
    expect(conferirCodigoEdicao('ERR0-ERR0', hash)).toBe(false)
  })

  it('recusa código ausente ou vazio, e caso sem hash guardado', () => {
    const hash = hashCodigoEdicao('7K9P-2M4X')
    expect(conferirCodigoEdicao(undefined, hash)).toBe(false)
    expect(conferirCodigoEdicao('', hash)).toBe(false)
    expect(conferirCodigoEdicao('   ', hash)).toBe(false)
    expect(conferirCodigoEdicao('7K9P-2M4X', null)).toBe(false)
  })

  it('calcula HMAC-SHA-256 usando o CODIGO_SEGREDO do ambiente', () => {
    process.env.CODIGO_SEGREDO = 'segredo-a'
    const hashA = hashCodigoEdicao('7K9P-2M4X')
    const esperadoA = createHmac('sha256', 'segredo-a').update('7K9P2M4X').digest('hex')
    expect(hashA).toBe(esperadoA)

    process.env.CODIGO_SEGREDO = 'segredo-b'
    const hashB = hashCodigoEdicao('7K9P-2M4X')
    expect(hashB).not.toBe(hashA)
  })

  it('exige CODIGO_SEGREDO definido em produção', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.CODIGO_SEGREDO
    expect(() => hashCodigoEdicao('7K9P-2M4X')).toThrow(/CODIGO_SEGREDO/)
  })
})
