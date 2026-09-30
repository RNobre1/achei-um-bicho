import { describe, expect, it } from 'vitest'
import { acrescentarCaso, lerMeusCasos, type MeuCaso } from './meus-casos'

function caso(id: string, publicadoEm = '2026-09-28T12:00:00.000Z'): MeuCaso {
  return { id, tipo: 'perdido', codigoEdicao: 'ABCD-EFGH', nome: 'Nego', publicadoEm }
}

describe('casos publicados neste aparelho', () => {
  it('põe o caso novo no começo da lista', () => {
    const lista = acrescentarCaso([caso('a')], caso('b', '2026-09-29T12:00:00.000Z'))
    expect(lista.map((c) => c.id)).toEqual(['b', 'a'])
  })

  it('não duplica o mesmo caso, fica com o registro mais novo', () => {
    const lista = acrescentarCaso([caso('a')], { ...caso('a'), codigoEdicao: 'WXYZ-2345' })
    expect(lista).toHaveLength(1)
    expect(lista[0]!.codigoEdicao).toBe('WXYZ-2345')
  })

  it('lê a lista guardada e ignora o que estiver corrompido', () => {
    expect(lerMeusCasos(JSON.stringify([caso('a')]))).toEqual([caso('a')])
    expect(lerMeusCasos(null)).toEqual([])
    expect(lerMeusCasos('{isso não é json')).toEqual([])
    expect(lerMeusCasos(JSON.stringify({ id: 'a' }))).toEqual([])
    expect(lerMeusCasos(JSON.stringify([caso('a'), { id: 'sem-codigo' }, 42]))).toEqual([caso('a')])
  })
})
