import { describe, expect, it } from 'vitest'
import { descreverOndeFoiVisto, momentoDoAvistamento, montarAvistamento, pendenciasDoAvistamento } from './avistamento'

// fuso de Santarém nos testes: 15:00 UTC são 12h locais
const AGORA = new Date('2026-09-30T15:00:00Z')
const PONTO = { latitude: -2.44, longitude: -54.71 }

describe('avistamento', () => {
  describe('momentoDoAvistamento', () => {
    it('"agora há pouco" é o momento do envio', () => {
      expect(momentoDoAvistamento('agora', AGORA)).toBe(AGORA.toISOString())
    })

    it('"hoje mais cedo" volta três horas', () => {
      expect(momentoDoAvistamento('hoje_mais_cedo', AGORA)).toBe('2026-09-30T12:00:00.000Z')
    })

    it('"hoje mais cedo" de madrugada não atravessa para ontem', () => {
      const madrugada = new Date('2026-09-30T04:30:00Z') // 01:30 em Santarém
      expect(momentoDoAvistamento('hoje_mais_cedo', madrugada)).toBe('2026-09-30T03:00:00.000Z') // 00:00 local
    })

    it('"ontem" é ontem à tarde, a hora mais comum de quem anda na rua', () => {
      expect(momentoDoAvistamento('ontem', AGORA)).toBe('2026-09-29T19:00:00.000Z') // 16h local
    })
  })

  it('só deixa enviar com lugar e momento', () => {
    expect(pendenciasDoAvistamento({ observacao: '', bairro: '' })).toEqual([
      'Marque onde você viu',
      'Diga quando você viu',
    ])
    expect(pendenciasDoAvistamento({ ponto: PONTO, quando: 'agora', observacao: '', bairro: '' })).toEqual([])
  })

  it('monta o corpo da API sem campos vazios', () => {
    expect(montarAvistamento({ ponto: PONTO, quando: 'agora', observacao: '  ', bairro: ' Santa Clara ' }, AGORA)).toEqual({
      latitude: -2.44,
      longitude: -54.71,
      bairro: 'Santa Clara',
      vistoEm: AGORA.toISOString(),
    })
    expect(
      montarAvistamento({ ponto: PONTO, quando: 'agora', observacao: 'Mancando', bairro: '' }, AGORA).observacao,
    ).toBe('Mancando')
  })

  it('recusa montar sem lugar', () => {
    expect(() => montarAvistamento({ quando: 'agora', observacao: '', bairro: '' }, AGORA)).toThrow('Marque onde você viu')
  })

  it('descreve para quem publicou onde o bicho foi visto, sem expor o ponto', () => {
    expect(descreverOndeFoiVisto({ bairro: 'Santa Clara', distanciaM: 420 }, 'perdido')).toBe(
      'Santa Clara · a 420 m de onde ele sumiu',
    )
    expect(descreverOndeFoiVisto({ bairro: null, distanciaM: 1600 }, 'encontrado')).toBe(
      'Bairro não informado · a 1,6 km de onde foi achado',
    )
  })
})
