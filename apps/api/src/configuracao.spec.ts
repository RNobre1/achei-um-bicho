import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { lerConfiguracao, SEGREDO_PADRAO_DESENVOLVIMENTO } from './configuracao'

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
      codigoSegredo: 'segredo-local-desenvolvimento',
      limiteLeituraPorMinuto: 600,
      limiteEscritaPorMinuto: 60,
      limiteFotosPorMinuto: 1200,
      saltosDeProxy: 1,
    })
    expect(SEGREDO_PADRAO_DESENVOLVIMENTO).toBe('segredo-local-desenvolvimento')
  })

  it('lê porta, origens, raio, prazos e chave de tarefas do ambiente', () => {
  })

  it('lê porta, origens, limites e saltos de proxy do ambiente', () => {
    const config = lerConfiguracao({
      PORT: '4000',
      CORS_ORIGINS: 'http://localhost:8081, https://achei.exemplo',
      RAIO_PADRAO_METROS: '2000',
      RAIO_MAXIMO_PAREAMENTO_METROS: '3000',
      DIAS_ATE_COBRANCA: '7',
      DIAS_ATE_EXPIRAR: '21',
      TAREFAS_CHAVE: 'segredo-123',
      CODIGO_SEGREDO: 'meu-segredo-customizado',
      LIMITE_LEITURA_POR_MINUTO: '800',
      LIMITE_ESCRITA_POR_MINUTO: '80',
      LIMITE_FOTOS_POR_MINUTO: '1500',
      SALTOS_DE_PROXY: '2',
    })
    expect(config).toEqual({
      porta: 4000,
      origensCors: ['http://localhost:8081', 'https://achei.exemplo'],
      raioPadraoM: 2000,
      raioMaximoPareamentoM: 3000,
      diasAteCobranca: 7,
      diasAteExpirar: 21,
      tarefasChave: 'segredo-123',
      codigoSegredo: 'meu-segredo-customizado',
      limiteLeituraPorMinuto: 800,
      limiteEscritaPorMinuto: 80,
      limiteFotosPorMinuto: 1500,
      saltosDeProxy: 2,
    })
  })

  it('exige CODIGO_SEGREDO em produção', () => {
    expect(() =>
      lerConfiguracao({
        NODE_ENV: 'production',
      }),
    ).toThrow(/CODIGO_SEGREDO/)
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

  it('recusa saltos de proxy que não é número inteiro positivo ou zero', () => {
    expect(() => lerConfiguracao({ SALTOS_DE_PROXY: 'abc' })).toThrow(/SALTOS_DE_PROXY/)
    expect(() => lerConfiguracao({ SALTOS_DE_PROXY: '-1' })).toThrow(/SALTOS_DE_PROXY/)
  })

  it('documenta os limites de tráfego e os saltos de proxy no .env.example', () => {
    const linhas = readFileSync(resolve(process.cwd(), '.env.example'), 'utf-8').split('\n')
    const variaveis = [
      'LIMITE_LEITURA_POR_MINUTO',
      'LIMITE_ESCRITA_POR_MINUTO',
      'LIMITE_FOTOS_POR_MINUTO',
      'SALTOS_DE_PROXY',
    ]
    const ambiente = Object.fromEntries(
      linhas
        .filter((linha) => linha && !linha.startsWith('#') && linha.includes('='))
        .map((linha) => {
          const separador = linha.indexOf('=')
          return [linha.slice(0, separador), linha.slice(separador + 1)]
        }),
    )
    const configuracaoDoExemplo = lerConfiguracao(ambiente)
    const configuracaoPadrao = lerConfiguracao({})

    for (const variavel of variaveis) {
      const indice = linhas.findIndex((linha) => linha.startsWith(`${variavel}=`))
      expect(indice, `${variavel} precisa estar no exemplo`).toBeGreaterThan(0)
      expect(linhas[indice - 1]?.startsWith('#')).toBe(true)
    }

    expect({
      leitura: configuracaoDoExemplo.limiteLeituraPorMinuto,
      escrita: configuracaoDoExemplo.limiteEscritaPorMinuto,
      fotos: configuracaoDoExemplo.limiteFotosPorMinuto,
      saltos: configuracaoDoExemplo.saltosDeProxy,
    }).toEqual({
      leitura: configuracaoPadrao.limiteLeituraPorMinuto,
      escrita: configuracaoPadrao.limiteEscritaPorMinuto,
      fotos: configuracaoPadrao.limiteFotosPorMinuto,
      saltos: configuracaoPadrao.saltosDeProxy,
    })
  })
})
