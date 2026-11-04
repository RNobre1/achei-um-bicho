import { CODIGO_EDICAO, type NovaPublicacao } from '@achei/contratos'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import * as Network from 'expo-network'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClienteApi } from './api'
import {
  enfileirarPublicacao,
  gerarCodigoEdicaoNoAparelho,
  iniciarObservadorDeFila,
  listarFila,
  processarFila,
} from './fila-de-envio'
import * as meusCasosServico from './meus-casos'

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

vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => 'c4e433a0-1234-4b56-8a90-123456789abc'),
  getRandomBytes: vi.fn((count: number) => new Uint8Array(count).fill(2)),
}))

vi.mock('expo-network', () => ({
  getNetworkStateAsync: vi.fn(async () => ({ isConnected: true, isInternetReachable: true })),
  addNetworkStateListener: vi.fn(() => ({ remove: vi.fn() })),
  NetworkStateType: { NONE: 'NONE', CELLULAR: 'CELLULAR', WIFI: 'WIFI', UNKNOWN: 'UNKNOWN' },
}))

vi.mock('./fotos', () => ({
  arquivoDaFoto: vi.fn(async (uri: string) => new Blob([uri])),
}))

const rascunhoExemplo = {
  tipo: 'perdido' as const,
  animal: { especie: 'cachorro' as const, porte: 'medio' as const, corDominante: 'caramelo' as const, coleira: 'com' as const, nome: 'Pipoca' },
  local: { latitude: -2.4385, longitude: -54.7085, bairro: 'Aparecida', referencia: '' },
  quando: { dia: 'ontem' as const, periodo: 'tarde' as const },
  relato: '',
  autor: { nome: 'Maria', telefone: '93991234567' },
  perguntas: [
    { enunciado: 'Pergunta 1', resposta: 'R1' },
    { enunciado: 'Pergunta 2', resposta: 'R2' },
    { enunciado: 'Pergunta 3', resposta: 'R3' },
  ],
  fotos: ['file:///foto1.jpg'],
}

describe('serviço de fila de envio (F9)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    vi.clearAllMocks()
  })

  it('gera código de edição no formato XXXX-XXXX com caracteres válidos', () => {
    const codigo = gerarCodigoEdicaoNoAparelho()
    expect(CODIGO_EDICAO.padrao.test(codigo)).toBe(true)
  })

  it('enfileira uma publicação gerando idCliente e código de edição no aparelho', async () => {
    const item = await enfileirarPublicacao(rascunhoExemplo)
    expect(item.idCliente).toBe('c4e433a0-1234-4b56-8a90-123456789abc')
    expect(CODIGO_EDICAO.padrao.test(item.codigoEdicao)).toBe(true)
    expect(item.nomeAnimal).toBe('Pipoca')

    const fila = await listarFila()
    expect(fila).toHaveLength(1)
    expect(fila[0]?.id).toBe(item.id)
  })

  it('processa a fila enviando o caso e guardando em Meus Casos só após confirmação', async () => {
    const guardarSpy = vi.spyOn(meusCasosServico, 'guardarMeuCaso').mockResolvedValue()
    const apiMock = {
      publicar: vi.fn(async (dados: NovaPublicacao) => ({
        id: 'caso-uuid-1',
        tipo: dados.tipo,
        estado: 'procurando' as const,
        codigoEdicao: dados.codigoEdicao!,
      })),
      enviarFoto: vi.fn(async () => ({ caminho: '/foto.jpg', largura: 1080, altura: 720 })),
    } as unknown as ClienteApi

    await enfileirarPublicacao(rascunhoExemplo, apiMock)
    await processarFila(apiMock)

    expect(apiMock.publicar).toHaveBeenCalledTimes(1)
    expect(guardarSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'caso-uuid-1',
        codigoEdicao: expect.stringMatching(CODIGO_EDICAO.padrao),
        nome: 'Pipoca',
      }),
    )
    expect(apiMock.enviarFoto).toHaveBeenCalledTimes(1)

    const fila = await listarFila()
    expect(fila[0]?.estado).toBe('enviado')
  })

  it('não envia nada quando está sem conexão', async () => {
    vi.mocked(Network.getNetworkStateAsync).mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
      type: Network.NetworkStateType.NONE,
    })
    const apiMock = { publicar: vi.fn() } as unknown as ClienteApi

    await enfileirarPublicacao(rascunhoExemplo, apiMock)
    await processarFila(apiMock)

    expect(apiMock.publicar).not.toHaveBeenCalled()
    const fila = await listarFila()
    expect(fila[0]?.estado).toBe('esperando')
  })

  it('ouve a volta da conexão e dispara o processamento', () => {
    let ouvinte: ((e: Network.NetworkStateEvent) => void) | undefined
    vi.mocked(Network.addNetworkStateListener).mockImplementationOnce((cb) => {
      ouvinte = cb
      return { remove: vi.fn() }
    })

    const apiMock = { publicar: vi.fn() } as unknown as ClienteApi
    const limpar = iniciarObservadorDeFila(apiMock)

    expect(Network.addNetworkStateListener).toHaveBeenCalledTimes(1)
    expect(ouvinte).toBeDefined()
    limpar()
  })
})
