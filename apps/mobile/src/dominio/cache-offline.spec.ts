import type { CasoAberto, Mural } from '@achei/contratos'
import { describe, expect, it } from 'vitest'
import {
  MAXIMO_CASOS_EM_CACHE,
  MENSAGEM_SEM_CONEXAO_SEM_CACHE,
  acrescentarCasoAoCache,
  buscarCasoNoCache,
  decidirCacheCaso,
  decidirCacheMural,
  distanciaEmMetros,
  formatarAvisoSemConexao,
  type CasoEmCache,
  type MuralEmCache,
  type ParametrosConsultaMural,
} from './cache-offline'

function criarCasoFake(id: string): CasoAberto {
  return {
    id,
    tipo: 'perdido',
    estado: 'procurando',
    relato: null,
    ocorridoEm: '2026-10-10T10:00:00.000Z',
    publicadoEm: '2026-10-10T12:00:00.000Z',
    animal: {
      especie: 'cachorro',
      porte: 'medio',
      corDominante: 'caramelo',
      coleira: 'com',
      nome: `Bicho ${id}`,
      castrado: null,
    },
    fotos: [],
    area: { latitude: -2.4385, longitude: -54.7085, raioM: 1600, bairro: 'Aparecida' },
  }
}

function criarMuralFake(): Mural {
  return {
    raioM: 1600,
    casos: [],
    totalNoRaioMaximo: 0,
  }
}

describe('regras de cache do mural e casos abertos sem conexão (RNF3)', () => {
  it('formata o aviso com o horário no formato exato', () => {
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
    expect(cache[0]?.caso.id).toBe('25')
    expect(cache[19]?.caso.id).toBe('6')
  })

  it('busca caso guardado no cache por id', () => {
    const caso = criarCasoFake('abc')
    const cache = acrescentarCasoAoCache([], caso, new Date())

    expect(buscarCasoNoCache(cache, 'abc')?.caso).toEqual(caso)
    expect(buscarCasoNoCache(cache, 'inexistente')).toBeUndefined()
  })

  describe('distância em metros para conferir raio de busca', () => {
    it('calcula 0 para o mesmo ponto', () => {
      const ponto = { latitude: -2.4385, longitude: -54.7085 }
      expect(distanciaEmMetros(ponto, ponto)).toBe(0)
    })

    it('calcula distância razoável entre pontos próximos de Santarém', () => {
      const p1 = { latitude: -2.4385, longitude: -54.7085 }
      // ~100m ao norte (~0.0009 graus de latitude)
      const p2 = { latitude: -2.4376, longitude: -54.7085 }
      const d = distanciaEmMetros(p1, p2)
      expect(d).toBeGreaterThan(90)
      expect(d).toBeLessThan(110)
    })
  })

  describe('decisão de cache do mural', () => {
    const centroSantarem = { latitude: -2.4385, longitude: -54.7085 }
    const consultaBase: ParametrosConsultaMural = {
      centro: centroSantarem,
      raio: 1600,
      tipo: 'perdido',
    }
    const muralCache: MuralEmCache = {
      mural: criarMuralFake(),
      consulta: consultaBase,
      carregadoEm: '2026-10-10T14:35:00.000Z',
    }

    it('não usa cache quando o erro é do servidor (status !== 0)', () => {
      const decisao = decidirCacheMural(
        { status: 500, mensagem: 'Erro interno no servidor' },
        consultaBase,
        muralCache,
      )
      expect(decisao.usarCache).toBe(false)
      if (!decisao.usarCache) {
        expect(decisao.erro).toBe('Erro interno no servidor')
      }
    })

    it('não usa cache quando não há nada guardado', () => {
      const decisao = decidirCacheMural({ status: 0 }, consultaBase, null)
      expect(decisao.usarCache).toBe(false)
      if (!decisao.usarCache) {
        expect(decisao.erro).toBe(MENSAGEM_SEM_CONEXAO_SEM_CACHE)
      }
    })

    it('não usa cache se o tipo da busca for diferente', () => {
      const decisao = decidirCacheMural(
        { status: 0 },
        { ...consultaBase, tipo: 'encontrado' },
        muralCache,
      )
      expect(decisao.usarCache).toBe(false)
      if (!decisao.usarCache) {
        expect(decisao.erro).toBe(MENSAGEM_SEM_CONEXAO_SEM_CACHE)
      }
    })

    it('não usa cache se o raio da busca for diferente', () => {
      const decisao = decidirCacheMural(
        { status: 0 },
        { ...consultaBase, raio: 3200 },
        muralCache,
      )
      expect(decisao.usarCache).toBe(false)
      if (!decisao.usarCache) {
        expect(decisao.erro).toBe(MENSAGEM_SEM_CONEXAO_SEM_CACHE)
      }
    })

    it('não usa cache se o centro estiver a mais de 200 m de distância', () => {
      // ~300m ao norte (~0.0027 graus de latitude)
      const centroLonge = { latitude: -2.4358, longitude: -54.7085 }
      const decisao = decidirCacheMural(
        { status: 0 },
        { ...consultaBase, centro: centroLonge },
        muralCache,
      )
      expect(decisao.usarCache).toBe(false)
      if (!decisao.usarCache) {
        expect(decisao.erro).toBe(MENSAGEM_SEM_CONEXAO_SEM_CACHE)
      }
    })

    it('usa cache quando status é 0, mesmo tipo, mesmo raio e centro até 200 m', () => {
      // ~100m ao norte (~0.0009 graus)
      const centroPerto = { latitude: -2.4376, longitude: -54.7085 }
      const decisao = decidirCacheMural(
        { status: 0 },
        { ...consultaBase, centro: centroPerto },
        muralCache,
      )
      expect(decisao.usarCache).toBe(true)
      if (decisao.usarCache) {
        expect(decisao.mural).toBe(muralCache.mural)
        expect(decisao.aviso).toContain('Sem conexão. Mostrando o que foi carregado')
      }
    })
  })

  describe('decisão de cache do caso aberto', () => {
    const caso1 = criarCasoFake('caso-1')
    const casoCache: CasoEmCache = {
      caso: caso1,
      carregadoEm: '2026-10-10T14:35:00.000Z',
    }

    it('não usa cache se o status é 404 (caso não existe mais)', () => {
      const decisao = decidirCacheCaso({ status: 404, mensagem: 'Não encontrado' }, 'caso-1', casoCache)
      expect(decisao.usarCache).toBe(false)
      if (!decisao.usarCache) {
        expect(decisao.erro).toBe('Este caso não existe mais ou o link está errado.')
      }
    })

    it('não usa cache se o status é outro erro de servidor (ex: 500)', () => {
      const decisao = decidirCacheCaso({ status: 500, mensagem: 'Falha no banco' }, 'caso-1', casoCache)
      expect(decisao.usarCache).toBe(false)
      if (!decisao.usarCache) {
        expect(decisao.erro).toBe('Falha no banco')
      }
    })

    it('usa cache quando status é 0 e o caso está em cache', () => {
      const decisao = decidirCacheCaso({ status: 0 }, 'caso-1', casoCache)
      expect(decisao.usarCache).toBe(true)
      if (decisao.usarCache) {
        expect(decisao.caso).toBe(caso1)
        expect(decisao.aviso).toContain('Sem conexão. Mostrando o que foi carregado')
      }
    })

    it('não usa cache se status é 0 mas o caso não está em cache', () => {
      const decisao = decidirCacheCaso({ status: 0 }, 'caso-1', null)
      expect(decisao.usarCache).toBe(false)
      if (!decisao.usarCache) {
        expect(decisao.erro).toContain('Sem conexão')
      }
    })
  })
})
