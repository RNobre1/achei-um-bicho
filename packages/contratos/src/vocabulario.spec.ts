import { describe, expect, it } from 'vitest'
import {
  ESTADO_CASO,
  ESTADO_INICIAL,
  ESTADOS_ABERTOS,
  PORTE,
  TIPO_CASO,
  VOCABULARIO,
  opcoes,
} from './vocabulario'

const conjuntos = Object.entries(VOCABULARIO)

describe('vocabulário fechado', () => {
  it.each(conjuntos)('%s tem ao menos dois valores', (_nome, conjunto) => {
    expect(conjunto.valores.length).toBeGreaterThanOrEqual(2)
  })

  it.each(conjuntos)('%s usa só snake_case sem acento nos valores', (_nome, conjunto) => {
    for (const valor of conjunto.valores) {
      expect(valor).toMatch(/^[a-z]+(_[a-z]+)*$/)
    }
  })

  it.each(conjuntos)('%s explica o porquê de cada entrada', (_nome, conjunto) => {
    for (const valor of conjunto.valores) {
      const entrada = (conjunto.entradas as Record<string, { rotulo: string; porque: string }>)[valor]
      expect(entrada?.rotulo.trim()).not.toBe('')
      expect(entrada?.porque.trim().length).toBeGreaterThanOrEqual(20)
    }
  })

  it('o tipo de caso tem exatamente os dois lados do problema', () => {
    expect(TIPO_CASO.valores).toEqual(['perdido', 'encontrado'])
  })

  it('cada tipo de caso nasce num estado que existe', () => {
    expect(ESTADO_INICIAL).toEqual({
      perdido: 'procurando',
      encontrado: 'abrigado_temporariamente',
    })
    for (const estado of Object.values(ESTADO_INICIAL)) {
      expect(ESTADO_CASO.valores).toContain(estado)
    }
  })

  it('caso aberto é todo caso que ainda está num estado inicial', () => {
    expect([...ESTADOS_ABERTOS].sort()).toEqual(Object.values(ESTADO_INICIAL).sort())
  })

  it('opcoes devolve valor e rótulo na ordem declarada, pronto para virar chip', () => {
    expect(opcoes(PORTE)).toEqual([
      { valor: 'pequeno', rotulo: 'Pequeno' },
      { valor: 'medio', rotulo: 'Médio' },
      { valor: 'grande', rotulo: 'Grande' },
    ])
  })
})
