import { describe, expect, it } from 'vitest'
import { atributosDoCaso, descreverQuando, fraseDoLocal, TITULO_DO_LOCAL } from './caso-aberto'

// os testes rodam no fuso de Santarém (vitest.config.ts), que é UTC-3 o ano inteiro
const AGORA = new Date('2026-08-24T15:00:00Z') // segunda, 12h em Santarém

describe('caso aberto', () => {
  describe('descreverQuando', () => {
    it('dá dia da semana, data e hora aproximada, como no protótipo', () => {
      expect(descreverQuando('2026-08-22T20:10:00Z', AGORA)).toBe('Sábado, 22/08, por volta das 17h')
    })

    it('diz "hoje" e "ontem" em vez da data quando é perto', () => {
      expect(descreverQuando('2026-08-24T12:40:00Z', AGORA)).toBe('Hoje, por volta das 9h')
      expect(descreverQuando('2026-08-23T23:05:00Z', AGORA)).toBe('Ontem, por volta das 20h')
    })

    it('usa o fuso do aparelho, e não o UTC, para decidir o dia', () => {
      // 01:30 UTC de segunda ainda é domingo, 22:30, em Santarém
      expect(descreverQuando('2026-08-24T01:30:00Z', AGORA)).toBe('Ontem, por volta das 22h')
    })
  })

  describe('fraseDoLocal', () => {
    it('diz o bairro e avisa que o endereço exato não é publicado', () => {
      expect(fraseDoLocal('Aparecida')).toBe('No bairro Aparecida. O endereço exato não é publicado.')
    })

    it('não inventa bairro quando quem publicou não informou', () => {
      expect(fraseDoLocal(null)).toBe('Dentro do círculo marcado. O endereço exato não é publicado.')
    })
  })

  it('o título do mapa depende do lado do caso', () => {
    expect(TITULO_DO_LOCAL.perdido).toBe('Onde foi visto por último')
    expect(TITULO_DO_LOCAL.encontrado).toBe('Onde foi achado')
  })

  describe('atributosDoCaso', () => {
    const animal = {
      especie: 'cachorro',
      porte: 'medio',
      corDominante: 'caramelo',
      coleira: 'com',
      nome: 'Nego',
      castrado: true,
    } as const

    it('lista os atributos com os rótulos do vocabulário', () => {
      expect(atributosDoCaso(animal)).toEqual([
        { rotulo: 'Bicho', valor: 'Cachorro' },
        { rotulo: 'Porte', valor: 'Médio' },
        { rotulo: 'Cor', valor: 'Caramelo' },
        { rotulo: 'Coleira', valor: 'Tem' },
        { rotulo: 'Castrado', valor: 'Sim' },
      ])
    })

    it('deixa castrado de fora quando ninguém informou', () => {
      const rotulos = atributosDoCaso({ ...animal, castrado: null, coleira: 'nao_observado' }).map((a) => a.rotulo)
      expect(rotulos).not.toContain('Castrado')
      expect(atributosDoCaso({ ...animal, coleira: 'nao_observado' })[3]).toEqual({
        rotulo: 'Coleira',
        valor: 'Não deu para ver',
      })
    })
  })
})
