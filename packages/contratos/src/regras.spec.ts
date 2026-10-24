import { describe, expect, it } from 'vitest'
import {
  chaveDoTelefone,
  FOTO,
  normalizarTelefone,
  PAREAMENTO,
  RAIO,
  TELEFONE,
} from './regras'

describe('regras do raio do mural', () => {
  it('parte de 1,6 km, a distância em que 7 de cada 10 cães recuperados apareceram', () => {
    expect(RAIO.padraoM).toBe(1600)
  })

  it('mantém o padrão entre o mínimo e o máximo', () => {
    expect(RAIO.minimoM).toBeLessThan(RAIO.padraoM)
    expect(RAIO.padraoM).toBeLessThan(RAIO.maximoM)
  })

  it('oferece ao usuário degraus crescentes dentro dos limites, começando pelo padrão', () => {
    expect(RAIO.degrausM[0]).toBe(RAIO.padraoM)
    expect(RAIO.degrausM.at(-1)).toBe(RAIO.maximoM)
    expect([...RAIO.degrausM].sort((a, b) => a - b)).toEqual(RAIO.degrausM)
  })
})

describe('regras da foto do animal', () => {
  it('cabe no limite de dados da publicação, que é de 1 MB no total', () => {
    expect(FOTO.maximoBytes).toBeLessThanOrEqual(1_000_000)
  })

  it('é reduzida no aparelho a uma largura que ainda mostra os sinais do bicho', () => {
    expect(FOTO.larguraMaximaPx).toBeGreaterThanOrEqual(720)
    expect(FOTO.larguraMaximaPx).toBeLessThanOrEqual(1280)
  })

  it('tem um limite de fotos por caso', () => {
    expect(FOTO.maximoPorCaso).toBe(3)
  })
})

describe('regras do pareamento', () => {
  it('só procura candidato até o raio máximo do mural, a regra RN7', () => {
    expect(PAREAMENTO.raioMaximoM).toBe(RAIO.maximoM)
  })

  it('conta a distância como coincidência dentro do raio padrão, onde aparecem 7 de 10 cães', () => {
    expect(PAREAMENTO.distanciaQueBateM).toBe(RAIO.padraoM)
  })

  it('aceita achado um pouco antes do sumiço declarado, porque memória e relógio erram', () => {
    expect(PAREAMENTO.diasAntesQueAindaBatem).toBeGreaterThanOrEqual(0)
    expect(PAREAMENTO.diasAntesQueAindaBatem).toBeLessThan(PAREAMENTO.diasDepoisQueBatem)
  })
})

describe('regras de telefone', () => {
  it('valida telefone com 10 ou 11 dígitos', () => {
    expect(TELEFONE.expressao.test('93991234567')).toBe(true)
    expect(TELEFONE.expressao.test('9335221234')).toBe(true)
    expect(TELEFONE.expressao.test('123')).toBe(false)
    expect(TELEFONE.expressao.test('9399123456789')).toBe(false)
  })

  it('normaliza retirando qualquer caractere não numérico', () => {
    expect(normalizarTelefone('(93) 99123-4567')).toBe('93991234567')
    expect(TELEFONE.normalizar(' 93 3522-1234 ')).toBe('9335221234')
  })

  it('extrai a chave do telefone com DDD e os 8 últimos dígitos para casar número com e sem 9', () => {
    const comNove = '93991234567'
    const semNove = '9391234567'
    expect(chaveDoTelefone(comNove)).toBe('9391234567')
    expect(chaveDoTelefone(semNove)).toBe('9391234567')
    expect(chaveDoTelefone('(93) 99123-4567')).toBe(chaveDoTelefone('93 9123-4567'))
  })
})
