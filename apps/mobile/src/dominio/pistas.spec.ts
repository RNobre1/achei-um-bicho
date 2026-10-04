import type { Pista } from '@achei/contratos'
import { describe, expect, it } from 'vitest'
import { linhasDaPista, pareceForte, resumoDasPistas, resumoDoMeuCaso } from './pistas'

function pista(parte: Partial<Pista> = {}): Pista {
  return {
    id: 'p1',
    veredito: 'pendente',
    distanciaM: 850,
    diasDiferenca: 1,
    batem: [
      { atributo: 'porte', perdido: 'medio', encontrado: 'medio' },
      { atributo: 'cor', perdido: 'caramelo', encontrado: 'caramelo' },
      { atributo: 'distancia', metros: 850 },
      { atributo: 'tempo', dias: 1 },
    ],
    divergem: [{ atributo: 'coleira', perdido: 'com', encontrado: 'sem' }],
    outro: {
      id: 'c2',
      tipo: 'encontrado',
      bairro: 'Santa Clara',
      publicadoEm: '2026-10-02T12:00:00.000Z',
      animal: { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'sem', nome: null },
      foto: null,
    },
    ...parte,
  }
}

const texto = (linha: { destaque: string; resto: string }) => linha.destaque + linha.resto

describe('linhas da pista, como no protótipo', () => {
  it('lista primeiro o que bateu, com destaque, e depois o que não bateu', () => {
    const linhas = linhasDaPista(pista(), 'perdido')

    expect(linhas.map((l) => [l.bate, texto(l)])).toEqual([
      [true, 'Mesmo porte — médio'],
      [true, 'Mesma cor — caramelo'],
      [true, '850 m de onde ele sumiu'],
      [true, '1 dia depois do sumiço'],
      [false, 'Coleira não confere — o seu tinha, esse estava sem'],
    ])
    expect(linhas[0]!.destaque).toBe('Mesmo porte')
  })

  it('fala do ponto de vista de quem olha: para quem achou, "o seu" é o achado', () => {
    const linhas = linhasDaPista(pista(), 'encontrado')
    expect(texto(linhas.at(-1)!)).toBe('Coleira não confere — o seu estava sem, esse tinha')
  })

  it('diz o valor do outro caso quando porte ou cor não batem', () => {
    const linhas = linhasDaPista(
      pista({
        batem: [],
        divergem: [
          { atributo: 'porte', perdido: 'medio', encontrado: 'grande' },
          { atributo: 'cor', perdido: 'caramelo', encontrado: 'malhado' },
          { atributo: 'distancia', metros: 3400 },
          { atributo: 'tempo', dias: -3 },
        ],
      }),
      'perdido',
    )
    expect(linhas.map(texto)).toEqual([
      'Porte diferente — esse é grande',
      'Cor diferente — esse é malhado',
      '3,4 km de distância',
      'Achado 3 dias antes do sumiço informado',
    ])
  })

  it('escreve o tempo do jeito que se fala', () => {
    const tempo = (dias: number, bate = true) =>
      texto(linhasDaPista(pista({ batem: bate ? [{ atributo: 'tempo', dias }] : [], divergem: bate ? [] : [{ atributo: 'tempo', dias }] }), 'perdido')[0]!)
    expect(tempo(0)).toBe('No mesmo dia do sumiço')
    expect(tempo(4)).toBe('4 dias depois do sumiço')
    expect(tempo(-1)).toBe('1 dia antes do sumiço informado')
    expect(tempo(45, false)).toBe('Achado 45 dias depois do sumiço')
  })

  it('coleira igual vira uma frase só', () => {
    const linhas = linhasDaPista(pista({ batem: [{ atributo: 'coleira', perdido: 'sem', encontrado: 'sem' }], divergem: [] }), 'perdido')
    expect(texto(linhas[0]!)).toBe('Os dois sem coleira')
  })
})

describe('peso visual da pista', () => {
  it('o botão de destaque fica para o par em que bate mais do que diverge', () => {
    expect(pareceForte(pista())).toBe(true)
    expect(pareceForte(pista({ batem: [{ atributo: 'tempo', dias: 1 }] }))).toBe(false)
  })
})

describe('resumos', () => {
  it('abre a tela dizendo quantos casos batem, sem número de compatibilidade', () => {
    expect(resumoDasPistas(1)).toBe('Um caso bate com o que você publicou. Quem decide é você — o aplicativo só aproxima.')
    expect(resumoDasPistas(3)).toBe('3 casos batem com o que você publicou. Quem decide é você — o aplicativo só aproxima.')
  })

  it('resume avisos e pistas de cada caso publicado no aparelho', () => {
    expect(resumoDoMeuCaso('perdido', 3, 2)).toEqual([
      { destaque: '3 pessoas', resto: ' disseram ter visto' },
      { destaque: '2 casos', resto: ' podem ser ele' },
    ])
    expect(resumoDoMeuCaso('encontrado', 1, 1)).toEqual([
      { destaque: '1 pessoa', resto: ' disse ter visto' },
      { destaque: '1 caso', resto: ' de quem perdeu bate com ele' },
    ])
    expect(resumoDoMeuCaso('perdido', 0, 0)).toEqual([])
  })
})
