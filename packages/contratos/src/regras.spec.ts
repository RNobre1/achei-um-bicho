import { describe, expect, it } from 'vitest'
import { RAIO } from './regras'

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
