import { describe, expect, it } from 'vitest'
import { lerConfiguracao } from './configuracao'

describe('configuração lida do ambiente', () => {
  it('tem padrões que funcionam em desenvolvimento sem nenhum .env', () => {
    expect(lerConfiguracao({})).toEqual({
      porta: 3333,
      origensCors: ['http://localhost:8081'],
      raioPadraoM: 1600,
      raioMaximoPareamentoM: 5000,
      diasAteCobranca: 9,
      diasAteExpirar: 15,
      tarefasChave: undefined,
    })
  })

  it('lê porta, origens, raio, prazos e chave de tarefas do ambiente', () => {
    const config = lerConfiguracao({
      PORT: '4000',
      CORS_ORIGINS: 'http://localhost:8081, https://achei.exemplo',
      RAIO_PADRAO_METROS: '2000',
      RAIO_MAXIMO_PAREAMENTO_METROS: '3000',
      DIAS_ATE_COBRANCA: '7',
      DIAS_ATE_EXPIRAR: '21',
      TAREFAS_CHAVE: 'segredo-123',
    })
    expect(config).toEqual({
      porta: 4000,
      origensCors: ['http://localhost:8081', 'https://achei.exemplo'],
      raioPadraoM: 2000,
      raioMaximoPareamentoM: 3000,
      diasAteCobranca: 7,
      diasAteExpirar: 21,
      tarefasChave: 'segredo-123',
    })
  })

  it('recusa raio padrão fora dos limites do produto', () => {
    expect(() => lerConfiguracao({ RAIO_PADRAO_METROS: '10000' })).toThrow(/RAIO_PADRAO_METROS/)
    expect(() => lerConfiguracao({ RAIO_PADRAO_METROS: '100' })).toThrow(/RAIO_PADRAO_METROS/)
  })

  it('recusa porta que não é número', () => {
    expect(() => lerConfiguracao({ PORT: 'abc' })).toThrow(/PORT/)
  })

  it('recusa teto de pareamento fora dos limites do mural', () => {
    expect(() => lerConfiguracao({ RAIO_MAXIMO_PAREAMENTO_METROS: '20000' })).toThrow(/RAIO_MAXIMO_PAREAMENTO_METROS/)
  })

  it('recusa prazo de expiração menor ou igual ao de cobrança', () => {
    expect(() => lerConfiguracao({ DIAS_ATE_COBRANCA: '10', DIAS_ATE_EXPIRAR: '10' })).toThrow(/DIAS_ATE_EXPIRAR/)
    expect(() => lerConfiguracao({ DIAS_ATE_COBRANCA: '10', DIAS_ATE_EXPIRAR: '5' })).toThrow(/DIAS_ATE_EXPIRAR/)
  })
})
