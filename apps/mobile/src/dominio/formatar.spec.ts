import { describe, expect, it } from 'vitest'
import { formatarDistancia, formatarTempoDesde } from './formatar'

describe('distância como aparece no card do mural', () => {
  it.each([
    [0, 'aqui perto'],
    [40, 'aqui perto'],
    [850, '850 m'],
    [999, '1 km'],
    [1100, '1,1 km'],
    [1600, '1,6 km'],
    [4960, '5 km'],
  ])('%i metros viram "%s"', (metros, texto) => {
    expect(formatarDistancia(metros)).toBe(texto)
  })
})

describe('tempo desde a publicação', () => {
  const agora = new Date('2026-09-27T15:00:00-03:00')
  const antes = (minutos: number) => new Date(agora.getTime() - minutos * 60_000).toISOString()

  it.each([
    [0, 'agora mesmo'],
    [5, 'há 5 min'],
    [59, 'há 59 min'],
    [60, 'há 1 h'],
    [300, 'há 5 h'],
    [60 * 24, 'ontem'],
    [60 * 24 * 2, 'há 2 dias'],
    [60 * 24 * 13, 'há 13 dias'],
    [60 * 24 * 21, 'há 3 semanas'],
  ])('%i minutos atrás vira "%s"', (minutos, texto) => {
    expect(formatarTempoDesde(antes(minutos), agora)).toBe(texto)
  })
})
