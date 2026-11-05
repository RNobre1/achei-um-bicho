import type { CasoAberto } from '@achei/contratos'
import { describe, expect, it } from 'vitest'
import {
  MAXIMO_CASOS_EM_CACHE,
  acrescentarCasoAoCache,
  buscarCasoNoCache,
  formatarAvisoSemConexao,
  type CasoEmCache,
} from './cache-offline'

function criarCasoFake(id: string): CasoAberto {
  return {
    id,
    tipo: 'perdido',
    estado: 'procurando', relato: null,
    ocorridoEm: '2026-10-10T10:00:00.000Z',
    publicadoEm: '2026-10-10T12:00:00.000Z',
    animal: { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'com', nome: `Bicho ${id}`, castrado: null },
    fotos: [],
    area: { latitude: -2.4385, longitude: -54.7085, raioM: 1600, bairro: 'Aparecida' },
  }
}

describe('regras de cache do mural e casos abertos sem conexão (RNF3)', () => {
  it('formata o aviso com o horário no formato exato', () => {
    // 14:35 UTC ou local
    const data = new Date(2026, 9, 10, 14, 35)
    const aviso = formatarAvisoSemConexao(data.toISOString())
    expect(aviso).toBe('Sem conexão. Mostrando o que foi carregado às 14:35.')
  })

  it('acrescenta caso no cache no topo da lista', () => {
    const caso1 = criarCasoFake('1')
    const cache = acrescentarCasoAoCache([], caso1, new Date('2026-10-10T14:00:00.000Z'))

    expect(cache).toHaveLength(1)
    expect(cache[0]?.caso.id).toBe('1')
  })

  it('atualiza o horário e move para o topo quando o caso já estava no cache', () => {
    const caso1 = criarCasoFake('1')
    const caso2 = criarCasoFake('2')
    let cache: CasoEmCache[] = []

    cache = acrescentarCasoAoCache(cache, caso1, new Date('2026-10-10T14:00:00.000Z'))
    cache = acrescentarCasoAoCache(cache, caso2, new Date('2026-10-10T14:10:00.000Z'))
    cache = acrescentarCasoAoCache(cache, caso1, new Date('2026-10-10T14:20:00.000Z'))

    expect(cache).toHaveLength(2)
    expect(cache[0]?.caso.id).toBe('1')
    expect(cache[0]?.carregadoEm).toBe('2026-10-10T14:20:00.000Z')
    expect(cache[1]?.caso.id).toBe('2')
  })

  it('limita o cache a no máximo 20 casos abertos', () => {
    let cache: CasoEmCache[] = []
    for (let i = 1; i <= 25; i++) {
      cache = acrescentarCasoAoCache(cache, criarCasoFake(String(i)), new Date())
    }

    expect(cache).toHaveLength(MAXIMO_CASOS_EM_CACHE)
    expect(MAXIMO_CASOS_EM_CACHE).toBe(20)
    // O mais recente é o 25, o mais antigo remanescente é o 6
    expect(cache[0]?.caso.id).toBe('25')
    expect(cache[19]?.caso.id).toBe('6')
  })

  it('busca caso guardado no cache por id', () => {
    const caso = criarCasoFake('abc')
    const cache = acrescentarCasoAoCache([], caso, new Date())

    expect(buscarCasoNoCache(cache, 'abc')?.caso).toEqual(caso)
    expect(buscarCasoNoCache(cache, 'inexistente')).toBeUndefined()
  })
})
