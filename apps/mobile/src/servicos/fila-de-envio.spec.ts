import { CODIGO_EDICAO, type NovaPublicacao } from '@achei/contratos'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'
import * as Network from 'expo-network'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarItemFila } from '../dominio/fila'
import { ErroApi, type ClienteApi } from './api'
import {
  descartarItem,
  enfileirarPublicacao,
  gerarCodigoEdicaoNoAparelho,
  iniciarObservadorDeFila,
  listarFila,
  processarFila,
  reenviarItem,
  salvarFila,
} from './fila-de-envio'
import * as meusCasosServico from './meus-casos'

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}))

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

vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///app/documents/',
  copyAsync: vi.fn(async () => {}),
  deleteAsync: vi.fn(async () => {}),
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

  it('rejeita bytes fora do intervalo uniforme ao sortear o código de edição', () => {
    for (const byte of [248, 0, 1, 2, 3, 4, 5, 6, 7]) {
      vi.mocked(Crypto.getRandomBytes).mockReturnValueOnce(new Uint8Array([byte]))
    }

    expect(gerarCodigoEdicaoNoAparelho()).toBe('2345-6789')
    expect(Crypto.getRandomBytes).toHaveBeenCalledTimes(9)
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

  it('envia caso antes da foto na ordem real das chamadas', async () => {
    const chamadas: string[] = []
    const apiMock = {
      publicar: vi.fn(async (dados: NovaPublicacao) => {
        chamadas.push('caso')
        return {
          id: 'caso-uuid-1',
          tipo: dados.tipo,
          estado: 'procurando' as const,
          codigoEdicao: dados.codigoEdicao!,
        }
      }),
      enviarFoto: vi.fn(async () => {
        chamadas.push('foto')
        return { caminho: '/foto.jpg', largura: 1080, altura: 720 }
      }),
    } as unknown as ClienteApi

    await enfileirarPublicacao(rascunhoExemplo, apiMock)
    expect(chamadas).toEqual(['caso', 'foto'])
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

  it('foto não sobe e guardarMeuCaso não é chamado se o caso falhar', async () => {
    const guardarSpy = vi.spyOn(meusCasosServico, 'guardarMeuCaso')
    const apiMock = {
      publicar: vi.fn(async () => {
        throw new ErroApi(500, 'Erro de servidor')
      }),
      enviarFoto: vi.fn(),
    } as unknown as ClienteApi

    await enfileirarPublicacao(rascunhoExemplo, apiMock)

    expect(apiMock.publicar).toHaveBeenCalled()
    expect(apiMock.enviarFoto).not.toHaveBeenCalled()
    expect(guardarSpy).not.toHaveBeenCalled()
  })

  it('erro 4xx permanente vai direto a falhou sem agendar tentativa', async () => {
    const apiMock = {
      publicar: vi.fn(async () => {
        throw new ErroApi(409, 'Código de edição já utilizado em outro caso')
      }),
    } as unknown as ClienteApi

    await enfileirarPublicacao(rascunhoExemplo, apiMock)
    const fila = await listarFila()
    expect(fila[0]?.estado).toBe('falhou')
    expect(fila[0]?.ultimoErro).toBe('Código de edição já utilizado em outro caso')
    expect(fila[0]?.proximaTentativaEm).toBeUndefined()
  })

  it('recupera item preso em enviando ao iniciar processamento', async () => {
    const apiMock = {
      publicar: vi.fn(async (dados: NovaPublicacao) => ({
        id: 'caso-recup',
        tipo: dados.tipo,
        estado: 'procurando' as const,
        codigoEdicao: dados.codigoEdicao!,
      })),
      enviarFoto: vi.fn(async () => ({ caminho: '/f.jpg', largura: 1, altura: 1 })),
    } as unknown as ClienteApi

    const itemPreso = criarItemFila({
      idCliente: 'preso-1',
      codigoEdicao: '2345-6789',
      publicacao: {
        tipo: 'perdido',
        animal: { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'com', nome: 'Preso' },
        local: { latitude: -2.4385, longitude: -54.7085, bairro: 'Aparecida' },
        autor: { nome: 'Maria', telefone: '93991234567' },
        ocorridoEm: '2026-10-10T14:00:00.000Z',
        perguntas: [{ enunciado: 'P1', respostaEsperada: 'R1' }],
      },
      fotos: [],
      nomeAnimal: 'Preso',
    })
    itemPreso.estado = 'enviando'
    await salvarFila([itemPreso])

    await processarFila(apiMock)
    expect(apiMock.publicar).toHaveBeenCalled()
    const fila = await listarFila()
    expect(fila[0]?.estado).toBe('enviado')
  })

  it('enfileirar durante um passe em andamento não perde o item novo nem o item em envio', async () => {
    let resolverPublicacao1: () => void
    const promessaPublicacao1 = new Promise<void>((resolve) => {
      resolverPublicacao1 = resolve
    })

    const apiMock = {
      publicar: vi.fn(async (dados: NovaPublicacao) => {
        if (dados.idCliente === 'primeiro') {
          await promessaPublicacao1
          return { id: 'caso-1', tipo: dados.tipo, estado: 'procurando' as const, codigoEdicao: dados.codigoEdicao! }
        }
        return { id: 'caso-2', tipo: dados.tipo, estado: 'procurando' as const, codigoEdicao: dados.codigoEdicao! }
      }),
      enviarFoto: vi.fn(async () => ({ caminho: '/f.jpg', largura: 1, altura: 1 })),
    } as unknown as ClienteApi

    vi.mocked(Crypto.randomUUID).mockReturnValueOnce('primeiro').mockReturnValueOnce('segundo')

    const p1 = enfileirarPublicacao(rascunhoExemplo, apiMock)
    const p2 = enfileirarPublicacao({ ...rascunhoExemplo, animal: { ...rascunhoExemplo.animal, nome: 'Segundo' } }, apiMock)

    resolverPublicacao1!()
    await Promise.all([p1, p2])

    const fila = await listarFila()
    expect(fila).toHaveLength(2)
    expect(fila.some((i) => i.id === 'primeiro')).toBe(true)
    expect(fila.some((i) => i.id === 'segundo')).toBe(true)
    expect(fila[0]?.estado).toBe('enviado')
    expect(fila[1]?.estado).toBe('enviado')
  })

  it('copia fotos para diretório durável ao enfileirar e apaga ao finalizar', async () => {
    const apiMock = {
      publicar: vi.fn(async (dados: NovaPublicacao) => ({
        id: 'caso-foto',
        tipo: dados.tipo,
        estado: 'procurando' as const,
        codigoEdicao: dados.codigoEdicao!,
      })),
      enviarFoto: vi.fn(async () => ({ caminho: '/f.jpg', largura: 1, altura: 1 })),
    } as unknown as ClienteApi

    await enfileirarPublicacao(rascunhoExemplo, apiMock)

    expect(FileSystem.copyAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'file:///foto1.jpg',
        to: expect.stringContaining('file:///app/documents/'),
      }),
    )

    expect(FileSystem.deleteAsync).toHaveBeenCalled()
    const fila = await listarFila()
    expect(fila[0]?.estado).toBe('enviado')
    expect(fila[0]?.publicacao).toBeUndefined()
    expect(fila[0]?.fotos).toEqual([])
  })

  it('foto com erro permanente marca como falhou e fila segue concluindo o item', async () => {
    const apiMock = {
      publicar: vi.fn(async (dados: NovaPublicacao) => ({
        id: 'caso-foto-err',
        tipo: dados.tipo,
        estado: 'procurando' as const,
        codigoEdicao: dados.codigoEdicao!,
      })),
      enviarFoto: vi.fn(async () => {
        throw new ErroApi(422, 'Formato de imagem inválido')
      }),
    } as unknown as ClienteApi

    await enfileirarPublicacao(rascunhoExemplo, apiMock)
    const fila = await listarFila()
    expect(fila[0]?.estado).toBe('enviado')
    expect(fila[0]?.casoId).toBe('caso-foto-err')
  })

  it('descartar remove o item da fila e apaga as fotos locais', async () => {
    const apiMock = {
      publicar: vi.fn(async () => {
        throw new ErroApi(400, 'Dados inválidos')
      }),
    } as unknown as ClienteApi

    const item = await enfileirarPublicacao(rascunhoExemplo, apiMock)
    let fila = await listarFila()
    expect(fila).toHaveLength(1)
    expect(fila[0]?.estado).toBe('falhou')

    await descartarItem(item.id)
    fila = await listarFila()
    expect(fila).toHaveLength(0)
    expect(FileSystem.deleteAsync).toHaveBeenCalled()
  })

  it('reenviarItem zera tentativas e dispara novo passe', async () => {
    let falhar = true
    const apiMock = {
      publicar: vi.fn(async (dados: NovaPublicacao) => {
        if (falhar) throw new ErroApi(500, 'Servidor fora')
        return { id: 'caso-ok', tipo: dados.tipo, estado: 'procurando' as const, codigoEdicao: dados.codigoEdicao! }
      }),
      enviarFoto: vi.fn(async () => ({ caminho: '/f.jpg', largura: 1, altura: 1 })),
    } as unknown as ClienteApi

    const item = await enfileirarPublicacao(rascunhoExemplo, apiMock)
    let fila = await listarFila()
    expect(fila[0]?.estado).toBe('esperando')
    expect(fila[0]?.tentativas).toBe(1)

    falhar = false
    await reenviarItem(item.id, apiMock)
    fila = await listarFila()
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
