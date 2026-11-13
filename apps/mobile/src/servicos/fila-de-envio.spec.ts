import { CODIGO_EDICAO, type CasoAberto, type NovaPublicacao } from '@achei/contratos'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'
import * as Network from 'expo-network'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarItemFila, marcarCasoEnviado, marcarFalhaEnvio } from '../dominio/fila'
import { montarPublicacao } from '../dominio/publicacao'
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
  serializarOperacaoFila,
} from './fila-de-envio'
import * as meusCasosServico from './meus-casos'
import * as fotosServico from './fotos'

const appStateMock = vi.hoisted(() => ({
  ouvinte: undefined as ((estado: string) => void) | undefined,
  remover: vi.fn(),
}))

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  AppState: {
    addEventListener: vi.fn((_evento: string, ouvinte: (estado: string) => void) => {
      appStateMock.ouvinte = ouvinte
      return { remove: appStateMock.remover }
    }),
  },
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

function itemParaFila(id: string, agora: Date) {
  return criarItemFila({
    idCliente: id,
    codigoEdicao: '2345-6789',
    publicacao: montarPublicacao(rascunhoExemplo, agora),
    fotos: [],
    nomeAnimal: 'Pipoca',
    agora,
  })
}

describe('serviço de fila de envio (F9)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    vi.clearAllMocks()
    appStateMock.ouvinte = undefined
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('gera código de edição no formato XXXX-XXXX com caracteres válidos', () => {
    const codigo = gerarCodigoEdicaoNoAparelho()
    expect(CODIGO_EDICAO.padrao.test(codigo)).toBe(true)
  })

  it('operação da fila que lança não impede a seguinte', async () => {
    const primeira = serializarOperacaoFila(async () => {
      throw new Error('Falha local')
    })
    const segunda = serializarOperacaoFila(async () => 'seguinte')

    await expect(primeira).rejects.toThrow('Falha local')
    await expect(segunda).resolves.toBe('seguinte')
  })

  it('rejeita bytes fora do intervalo uniforme ao sortear o código de edição', () => {
    for (const byte of [248, 0, 1, 2, 3, 4, 5, 6, 7]) {
      vi.mocked(Crypto.getRandomBytes).mockReturnValueOnce(new Uint8Array([byte]))
    }

    expect(gerarCodigoEdicaoNoAparelho()).toBe('2345-6789')
    expect(Crypto.getRandomBytes).toHaveBeenCalledTimes(9)
  })

  it('enfileira uma publicação gerando idCliente e código de edição no aparelho', async () => {
    vi.mocked(Network.getNetworkStateAsync).mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
      type: Network.NetworkStateType.NONE,
    })

    const resultado = await enfileirarPublicacao(rascunhoExemplo)
    expect(resultado).toMatchObject({ tipo: 'guardado', idCliente: 'c4e433a0-1234-4b56-8a90-123456789abc' })
    if (resultado.tipo !== 'guardado') throw new Error('A publicação deveria estar guardada no aparelho')
    expect(CODIGO_EDICAO.padrao.test(resultado.codigoEdicao)).toBe(true)

    const fila = await listarFila()
    expect(fila).toHaveLength(1)
    expect(fila[0]?.id).toBe(resultado.idCliente)
    expect(fila[0]?.nomeAnimal).toBe('Pipoca')
  })

  it('bicho achado sem nome entra na fila com o nome da espécie, não em branco', async () => {
    vi.mocked(Network.getNetworkStateAsync).mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
      type: Network.NetworkStateType.NONE,
    })

    // o campo de nome começa como texto vazio no rascunho, não como ausente
    await enfileirarPublicacao({ ...rascunhoExemplo, animal: { ...rascunhoExemplo.animal, nome: '' } })

    const fila = await listarFila()
    expect(fila[0]?.nomeAnimal).toBe('Cachorro sem nome')
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

  it('publicação recusada é retirada da fila e apaga as cópias das fotos', async () => {
    const apiMock = {
      publicar: vi.fn(async () => {
        throw new ErroApi(400, 'Dados inválidos')
      }),
    } as unknown as ClienteApi

    const resultado = await enfileirarPublicacao(rascunhoExemplo, apiMock)
    const fila = await listarFila()
    expect(resultado).toEqual({ tipo: 'recusado', mensagem: 'Dados inválidos' })
    expect(fila).toEqual([])
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      expect.stringContaining('file:///app/documents/'),
      { idempotent: true },
    )
  })

  it('recusa num passe de fundo deixa o item em falhou, com a mensagem e as fotos guardadas', async () => {
    const apiMock = {
      publicar: vi.fn(async () => {
        throw new ErroApi(400, 'Telefone com DDD: 10 ou 11 dígitos')
      }),
    } as unknown as ClienteApi

    const guardado = criarItemFila({
      idCliente: 'guardado-offline',
      codigoEdicao: '2345-6789',
      publicacao: {
        tipo: 'perdido',
        animal: { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'com', nome: 'Guardado' },
        local: { latitude: -2.4385, longitude: -54.7085, bairro: 'Aparecida' },
        autor: { nome: 'Maria', telefone: '991234567' },
        ocorridoEm: '2026-10-10T14:00:00.000Z',
        perguntas: [{ enunciado: 'P1', respostaEsperada: 'R1' }],
      },
      fotos: ['file:///app/documents/fila-foto-guardada.jpg'],
      nomeAnimal: 'Guardado',
    })
    await salvarFila([guardado])

    await processarFila(apiMock)

    const fila = await listarFila()
    expect(fila).toHaveLength(1)
    expect(fila[0]).toMatchObject({ id: guardado.id, estado: 'falhou', ultimoErro: 'Telefone com DDD: 10 ou 11 dígitos' })
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled()
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

  it('não reenvia fotos já presentes no caso depois de uma tentativa anterior', async () => {
    const agora = new Date('2026-11-12T21:00:00.000Z')
    const itemComCaso = marcarCasoEnviado(
      criarItemFila({
        idCliente: 'com-fotos-incertas',
        codigoEdicao: '2345-6789',
        publicacao: montarPublicacao(rascunhoExemplo, agora),
        fotos: ['file:///foto1.jpg', 'file:///foto2.jpg', 'file:///foto3.jpg'],
        nomeAnimal: 'Pipoca',
        agora,
      }),
      'caso-com-foto-repetida',
      agora,
    )
    Reflect.set(itemComCaso, 'tentouEnviarFotos', true)
    await salvarFila([itemComCaso])

    const apiMock = {
      abrirCaso: vi.fn(async () => ({ fotos: [{ id: 'foto-servidor' }] }) as unknown as CasoAberto),
      publicar: vi.fn(),
      enviarFoto: vi.fn(async () => ({ caminho: '/foto.jpg', largura: 1, altura: 1 })),
    } as unknown as ClienteApi

    await processarFila(apiMock)

    expect(apiMock.abrirCaso).toHaveBeenCalledWith('caso-com-foto-repetida')
    expect(fotosServico.arquivoDaFoto).not.toHaveBeenCalledWith('file:///foto1.jpg')
    expect(fotosServico.arquivoDaFoto).toHaveBeenNthCalledWith(1, 'file:///foto2.jpg')
    expect(fotosServico.arquivoDaFoto).toHaveBeenNthCalledWith(2, 'file:///foto3.jpg')
    expect(apiMock.enviarFoto).toHaveBeenCalledTimes(2)
  })

  it('grava novo item antes de terminar o passe de publicação em andamento', async () => {
    let iniciarPrimeiraPublicacao: () => void = () => {}
    const primeiraPublicacaoIniciada = new Promise<void>((resolve) => {
      iniciarPrimeiraPublicacao = resolve
    })
    let liberarPrimeiraPublicacao: () => void = () => {}
    const primeiraPublicacaoLiberada = new Promise<void>((resolve) => {
      liberarPrimeiraPublicacao = resolve
    })

    const apiMock = {
      publicar: vi.fn(async (dados: NovaPublicacao) => {
        if (dados.idCliente === 'primeiro') {
          iniciarPrimeiraPublicacao()
          await primeiraPublicacaoLiberada
          return { id: 'caso-1', tipo: dados.tipo, estado: 'procurando' as const, codigoEdicao: dados.codigoEdicao! }
        }
        return { id: 'caso-2', tipo: dados.tipo, estado: 'procurando' as const, codigoEdicao: dados.codigoEdicao! }
      }),
      enviarFoto: vi.fn(async () => ({ caminho: '/f.jpg', largura: 1, altura: 1 })),
    } as unknown as ClienteApi

    vi.mocked(Crypto.randomUUID).mockReturnValueOnce('primeiro').mockReturnValueOnce('segundo')

    const p1 = enfileirarPublicacao(rascunhoExemplo, apiMock)
    await primeiraPublicacaoIniciada
    const p2 = enfileirarPublicacao(
      { ...rascunhoExemplo, animal: { ...rascunhoExemplo.animal, nome: 'Segundo' } },
      apiMock,
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    const dadosGravadosAntesDoFim = JSON.parse(
      (await AsyncStorage.getItem('achei-um-bicho:fila-de-envio')) ?? '[]',
    ) as { id: string }[]

    liberarPrimeiraPublicacao()
    await Promise.all([p1, p2])

    expect(dadosGravadosAntesDoFim).toHaveLength(2)
    expect(dadosGravadosAntesDoFim.some((item) => item.id === 'segundo')).toBe(true)
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
        throw new ErroApi(500, 'Servidor fora')
      }),
    } as unknown as ClienteApi

    const resultado = await enfileirarPublicacao(rascunhoExemplo, apiMock)
    if (resultado.tipo !== 'guardado') throw new Error('A publicação deveria continuar na fila')
    let fila = await listarFila()
    expect(fila).toHaveLength(1)
    expect(fila[0]?.estado).toBe('esperando')

    await descartarItem(resultado.idCliente)
    fila = await listarFila()
    expect(fila).toHaveLength(0)
    expect(FileSystem.deleteAsync).toHaveBeenCalled()
  })

  it('reenviarItem aguarda a conclusão do passe iniciado', async () => {
    let chamadas = 0
    let sinalizarSegundaPublicacao: () => void = () => {}
    const segundaPublicacaoIniciada = new Promise<void>((resolve) => {
      sinalizarSegundaPublicacao = resolve
    })
    let liberarSegundaPublicacao: () => void = () => {}
    const segundaPublicacaoLiberada = new Promise<void>((resolve) => {
      liberarSegundaPublicacao = resolve
    })
    const apiMock = {
      publicar: vi.fn(async (dados: NovaPublicacao) => {
        chamadas += 1
        if (chamadas === 1) throw new ErroApi(500, 'Servidor fora')
        sinalizarSegundaPublicacao()
        await segundaPublicacaoLiberada
        return { id: 'caso-ok', tipo: dados.tipo, estado: 'procurando' as const, codigoEdicao: dados.codigoEdicao! }
      }),
      enviarFoto: vi.fn(async () => ({ caminho: '/f.jpg', largura: 1, altura: 1 })),
    } as unknown as ClienteApi

    const resultado = await enfileirarPublicacao(rascunhoExemplo, apiMock)
    if (resultado.tipo !== 'guardado') throw new Error('A publicação deveria continuar na fila')
    let fila = await listarFila()
    expect(fila[0]?.estado).toBe('esperando')
    expect(fila[0]?.tentativas).toBe(1)

    let reenvioTerminou = false
    const reenvio = reenviarItem(resultado.idCliente, apiMock).then(() => {
      reenvioTerminou = true
    })
    await segundaPublicacaoIniciada
    await Promise.resolve()
    const aguardouPasse = !reenvioTerminou
    liberarSegundaPublicacao()
    await reenvio
    await processarFila(apiMock)

    fila = await listarFila()
    expect(aguardouPasse).toBe(true)
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

  it('trata rejeição do passe disparado pelo observador', async () => {
    vi.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('Falha local de armazenamento'))
    const apiMock = { publicar: vi.fn(), enviarFoto: vi.fn() } as unknown as ClienteApi

    const limpar = iniciarObservadorDeFila(apiMock)
    await new Promise((resolve) => setTimeout(resolve, 0))
    limpar()

    expect(AsyncStorage.getItem).toHaveBeenCalled()
  })

  it('agenda o menor horário de retentativa pendente', async () => {
    vi.useFakeTimers()
    const agora = new Date('2026-11-12T21:00:00.000Z')
    vi.setSystemTime(agora)
    const maisTarde = marcarFalhaEnvio(
      marcarFalhaEnvio(itemParaFila('mais-tarde', agora), { status: 500, mensagem: 'Falha 1' }, agora),
      { status: 500, mensagem: 'Falha 2' },
      agora,
    )
    const maisCedo = marcarFalhaEnvio(itemParaFila('mais-cedo', agora), { status: 500, mensagem: 'Falha' }, agora)
    await salvarFila([maisTarde, maisCedo])

    const publicados: string[] = []
    const apiMock = {
      publicar: vi.fn(async (dados: NovaPublicacao) => {
        publicados.push(dados.idCliente!)
        return { id: `caso-${dados.idCliente}`, tipo: dados.tipo, estado: 'procurando' as const, codigoEdicao: dados.codigoEdicao! }
      }),
      enviarFoto: vi.fn(),
    } as unknown as ClienteApi

    const limpar = iniciarObservadorDeFila(apiMock)
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(29_999)
    expect(publicados).toEqual([])

    await vi.advanceTimersByTimeAsync(1)
    expect(publicados).toEqual(['mais-cedo'])
    await vi.advanceTimersByTimeAsync(29_999)
    expect(publicados).toEqual(['mais-cedo'])
    await vi.advanceTimersByTimeAsync(1)
    expect(publicados).toEqual(['mais-cedo', 'mais-tarde'])
    limpar()
  })

  it('ao voltar a active tenta de novo e limpa timer e observadores', async () => {
    vi.useFakeTimers()
    const agora = new Date('2026-11-12T21:00:00.000Z')
    vi.setSystemTime(agora)
    const item = marcarFalhaEnvio(itemParaFila('pausado', agora), { status: 500, mensagem: 'Falha' }, agora)
    await salvarFila([item])
    vi.mocked(Network.getNetworkStateAsync).mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
      type: Network.NetworkStateType.NONE,
    })
    const removerRede = vi.fn()
    vi.mocked(Network.addNetworkStateListener).mockImplementationOnce(() => ({ remove: removerRede }))
    const apiMock = {
      publicar: vi.fn(),
      enviarFoto: vi.fn(),
    } as unknown as ClienteApi

    const limpar = iniciarObservadorDeFila(apiMock)
    await vi.advanceTimersByTimeAsync(0)
    const chamadasAntes = vi.mocked(Network.getNetworkStateAsync).mock.calls.length
    const ouvinte = appStateMock.ouvinte
    ouvinte?.('active')
    await vi.advanceTimersByTimeAsync(0)
    const passeAoRetomar = vi.mocked(Network.getNetworkStateAsync).mock.calls.length > chamadasAntes
    limpar()

    expect(ouvinte).toBeDefined()
    expect(passeAoRetomar).toBe(true)
    expect(appStateMock.remover).toHaveBeenCalledOnce()
    expect(removerRede).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
})
