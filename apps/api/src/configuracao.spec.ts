import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lerConfiguracao } from './configuracao'

describe('configuração lida do ambiente', () => {
  it('tem padrões que funcionam em desenvolvimento sem nenhum .env', () => {
    expect(lerConfiguracao({})).toEqual({
      porta: 3333,
      origensCors: ['http://localhost:8081'],
      raioPadraoM: 1600,
      pastaFotos: resolve('fotos'),
    })
  })

  it('lê porta, origens e raio do ambiente', () => {
    const config = lerConfiguracao({
      PORT: '4000',
      CORS_ORIGINS: 'http://localhost:8081, https://achei.exemplo',
      RAIO_PADRAO_METROS: '2000',
      PASTA_FOTOS: '/dados/fotos',
    })
    expect(config).toEqual({
      porta: 4000,
      origensCors: ['http://localhost:8081', 'https://achei.exemplo'],
      raioPadraoM: 2000,
      pastaFotos: '/dados/fotos',
    })
  })

  it('recusa raio padrão fora dos limites do produto', () => {
    expect(() => lerConfiguracao({ RAIO_PADRAO_METROS: '10000' })).toThrow(/RAIO_PADRAO_METROS/)
    expect(() => lerConfiguracao({ RAIO_PADRAO_METROS: '100' })).toThrow(/RAIO_PADRAO_METROS/)
  })

  it('recusa porta que não é número', () => {
    expect(() => lerConfiguracao({ PORT: 'abc' })).toThrow(/PORT/)
  })
})
