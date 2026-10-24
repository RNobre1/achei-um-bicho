import { describe, expect, it } from 'vitest'
import {
  acrescentarReivindicacao,
  lerMinhasReivindicacoes,
  type MinhaReivindicacao,
} from './minhas-reivindicacoes'

describe('minhas reivindicações salvas no aparelho', () => {
  const item: MinhaReivindicacao = {
    id: 'r1',
    casoId: 'c1',
    tipoCaso: 'perdido',
    codigoAcompanhamento: 'ABCD-EFGH',
    criadoEm: '2026-11-12T12:00:00.000Z',
    nomeAnimal: 'Nego',
  }

  it('acrescenta uma nova reivindicação no topo da lista sem duplicar', () => {
    const lista = acrescentarReivindicacao([], item)
    expect(lista).toEqual([item])

    const atualizada = { ...item, nomeAnimal: 'Nego Editado' }
    const lista2 = acrescentarReivindicacao(lista, atualizada)
    expect(lista2).toHaveLength(1)
    expect(lista2[0]!.nomeAnimal).toBe('Nego Editado')
  })

  it('lê lista do AsyncStorage com tolerância a corrupção', () => {
    expect(lerMinhasReivindicacoes(null)).toEqual([])
    expect(lerMinhasReivindicacoes('')).toEqual([])
    expect(lerMinhasReivindicacoes('não é json')).toEqual([])
    expect(lerMinhasReivindicacoes('{}')).toEqual([])

    const valido = JSON.stringify([item])
    expect(lerMinhasReivindicacoes(valido)).toEqual([item])
  })
})
