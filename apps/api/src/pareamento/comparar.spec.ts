import { describe, expect, it } from 'vitest'
import { compararCasos, ordemDasPistas, type LadoComparavel } from './comparar'

const DIA = 24 * 60 * 60 * 1000
const SUMIU = new Date('2026-10-01T20:00:00Z')

const perdido: LadoComparavel = { porte: 'medio', corDominante: 'caramelo', coleira: 'com', ocorridoEm: SUMIU }
const achado = (parte: Partial<LadoComparavel> = {}): LadoComparavel => ({
  porte: 'medio',
  corDominante: 'caramelo',
  coleira: 'com',
  ocorridoEm: new Date(SUMIU.getTime() + DIA),
  ...parte,
})

describe('comparação entre um caso perdido e um encontrado', () => {
  it('par que bate em tudo: mesmo porte, cor e coleira, perto e um dia depois', () => {
    const { batem, divergem, diasDiferenca } = compararCasos(perdido, achado(), 850)

    expect(batem.map((c) => c.atributo)).toEqual(['porte', 'cor', 'coleira', 'distancia', 'tempo'])
    expect(divergem).toEqual([])
    expect(diasDiferenca).toBe(1)
  })

  it('guarda os dois valores do que não bateu, para a tela dizer qual é qual', () => {
    const { divergem } = compararCasos(perdido, achado({ porte: 'grande', corDominante: 'malhado' }), 850)

    expect(divergem).toEqual([
      { atributo: 'porte', perdido: 'medio', encontrado: 'grande' },
      { atributo: 'cor', perdido: 'caramelo', encontrado: 'malhado' },
    ])
  })

  it('coleira diferente enfraquece o par, mas aparece: coleira pode cair', () => {
    const { divergem } = compararCasos(perdido, achado({ coleira: 'sem' }), 850)
    expect(divergem).toContainEqual({ atributo: 'coleira', perdido: 'com', encontrado: 'sem' })
  })

  it('coleira que ninguém conseguiu ver não entra na comparação, nem a favor nem contra', () => {
    const { batem, divergem } = compararCasos(perdido, achado({ coleira: 'nao_observado' }), 850)
    expect([...batem, ...divergem].map((c) => c.atributo)).not.toContain('coleira')
  })

  it('distância conta a favor até o raio padrão e contra depois dele', () => {
    expect(compararCasos(perdido, achado(), 1600).batem).toContainEqual({ atributo: 'distancia', metros: 1600 })
    expect(compararCasos(perdido, achado(), 3400).divergem).toContainEqual({ atributo: 'distancia', metros: 3400 })
  })

  it('achado antes do sumiço não bate, salvo um dia de folga para memória e relógio', () => {
    const umDiaAntes = achado({ ocorridoEm: new Date(SUMIU.getTime() - DIA) })
    const tresDiasAntes = achado({ ocorridoEm: new Date(SUMIU.getTime() - 3 * DIA) })

    expect(compararCasos(perdido, umDiaAntes, 850).batem).toContainEqual({ atributo: 'tempo', dias: -1 })
    expect(compararCasos(perdido, tresDiasAntes, 850).divergem).toContainEqual({ atributo: 'tempo', dias: -3 })
  })

  it('achado muito tempo depois do sumiço já não conta a favor', () => {
    const tarde = achado({ ocorridoEm: new Date(SUMIU.getTime() + 45 * DIA) })
    expect(compararCasos(perdido, tarde, 850).divergem).toContainEqual({ atributo: 'tempo', dias: 45 })
  })

  it('arredonda a diferença para dias inteiros: horas de diferença são o mesmo dia', () => {
    const mesmoDia = achado({ ocorridoEm: new Date(SUMIU.getTime() + 5 * 60 * 60 * 1000) })
    expect(compararCasos(perdido, mesmoDia, 850).diasDiferenca).toBe(0)
  })
})

describe('ordem das pistas', () => {
  it('primeiro o par com mais coincidências, depois o mais perto, sem nota nenhuma', () => {
    const pistas = [
      { batem: 2, distanciaM: 300 },
      { batem: 4, distanciaM: 2000 },
      { batem: 4, distanciaM: 900 },
    ].map(({ batem, distanciaM }) => ({ batem: Array(batem).fill({ atributo: 'porte' }), distanciaM }))

    const ordenadas = [...pistas].sort(ordemDasPistas)

    expect(ordenadas.map((p) => [p.batem.length, p.distanciaM])).toEqual([
      [4, 900],
      [4, 2000],
      [2, 300],
    ])
  })
})
