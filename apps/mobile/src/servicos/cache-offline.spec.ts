import type { CasoAberto, Mural } from '@achei/contratos'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  obterCasoDoCache,
  obterMuralDoCache,
  salvarCasoNoCache,
  salvarMuralNoCache,
} from './cache-offline'

vi.mock('@react-native-async-storage/async-storage', () => {
  let memoria: Record<string, string> = {}
  return {
    default: {
      getItem: vi.fn(async (chave: string) => memoria[chave] ?? null),
      setItem: vi.fn(async (chave: string, valor: string) => {
        memoria[chave] = valor
      }),
      removeItem: vi.fn(async (chave: string) => {
        delete memoria[chave]
      }),
      clear: vi.fn(async () => {
        memoria = {}
      }),
    },
  }
})

const muralFake: Mural = {
  raioM: 1600,
  casos: [],
  totalNoRaioMaximo: 0,
}

const casoFake: CasoAberto = {
  id: 'caso-1',
  tipo: 'perdido',
  estado: 'procurando',
  ocorridoEm: '2026-10-10T10:00:00.000Z',
  publicadoEm: '2026-10-10T12:00:00.000Z',
  animal: { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'com', nome: 'Pipoca' },
  fotos: [],
  area: { latitude: -2.4385, longitude: -54.7085, raioM: 1600, bairro: 'Aparecida' },
}

describe('serviço de cache offline (RNF3)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    vi.clearAllMocks()
  })

  it('guarda e recupera a última resposta do mural', async () => {
    expect(await obterMuralDoCache()).toBeNull()

    const agora = new Date('2026-10-10T14:30:00.000Z')
    await salvarMuralNoCache(muralFake, agora)

    const cache = await obterMuralDoCache()
    expect(cache?.mural).toEqual(muralFake)
    expect(cache?.carregadoEm).toBe('2026-10-10T14:30:00.000Z')
  })

  it('guarda e recupera casos abertos no limite de 20', async () => {
    expect(await obterCasoDoCache('caso-1')).toBeNull()

    const agora = new Date('2026-10-10T14:30:00.000Z')
    await salvarCasoNoCache(casoFake, agora)

    const recuperado = await obterCasoDoCache('caso-1')
    expect(recuperado?.caso).toEqual(casoFake)
    expect(recuperado?.carregadoEm).toBe('2026-10-10T14:30:00.000Z')
  })
})
