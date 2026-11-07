import { CODIGO_EDICAO, gerarCodigoEdicao } from '@achei/contratos'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'
import * as Network from 'expo-network'
import { Platform } from 'react-native'
import {
  criarItemFila,
  ehErroPermanente,
  marcarCasoEnviado,
  marcarEnviando,
  marcarFalhaEnvio,
  marcarFotoEnviada,
  marcarFotoFalhaPermanente,
  podeTentar,
  podarItemEnviado,
  recuperarItensPresosEmEnviando,
  reiniciarItemFalho,
  type ItemFilaEnvio,
} from '../dominio/fila'
import { nomeDoAnimal } from '../dominio/mural'
import { montarPublicacao, type RascunhoPublicacao } from '../dominio/publicacao'
import { ErroApi, api, type ClienteApi } from './api'
import { arquivoDaFoto } from './fotos'
import { guardarMeuCaso } from './meus-casos'

const CHAVE_STORAGE = 'achei-um-bicho:fila-de-envio'

/**
 * Sorteia o código de edição no próprio aparelho com gerador criptográfico do sistema
 * operacional (expo-crypto), sem depender de internet para obter o código (F9).
 * Usa a função compartilhada dos contratos para garantir fonte única.
 */
export function gerarCodigoEdicaoNoAparelho(): string {
  return gerarCodigoEdicao((max) => {
    const bytes = Crypto.getRandomBytes(1)
    return bytes[0]! % max
  })
}

export function gerarIdCliente(): string {
  return Crypto.randomUUID()
}

/** Cadeia única de promessas (mutex) para serializar leituras e escritas da fila. */
let cadeiaFila: Promise<unknown> = Promise.resolve()

export function serializarOperacaoFila<T>(operacao: () => Promise<T>): Promise<T> {
  const proxima = cadeiaFila.then(operacao, operacao)
  cadeiaFila = proxima.then(
    () => {},
    () => {},
  )
  return proxima
}

async function listarFilaInterno(): Promise<ItemFilaEnvio[]> {
  const guardado = await AsyncStorage.getItem(CHAVE_STORAGE)
  if (!guardado) return []
  try {
    const lido: unknown = JSON.parse(guardado)
    return Array.isArray(lido) ? (lido as ItemFilaEnvio[]) : []
  } catch {
    return []
  }
}

async function salvarFilaInterno(itens: ItemFilaEnvio[]): Promise<void> {
  await AsyncStorage.setItem(CHAVE_STORAGE, JSON.stringify(itens))
}

export async function listarFila(): Promise<ItemFilaEnvio[]> {
  return serializarOperacaoFila(async () => {
    return listarFilaInterno()
  })
}

export async function salvarFila(itens: ItemFilaEnvio[]): Promise<void> {
  return serializarOperacaoFila(async () => {
    return salvarFilaInterno(itens)
  })
}

async function copiarFotoParaDocumentos(uri: string): Promise<string> {
  try {
    const docDir = FileSystem.documentDirectory
    if (!docDir) return uri
    const nome = `foto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
    const destino = `${docDir.replace(/\/?$/, '/')}${nome}`
    await FileSystem.copyAsync({ from: uri, to: destino })
    return destino
  } catch {
    return uri
  }
}

async function apagarFotosDoItem(item: ItemFilaEnvio): Promise<void> {
  for (const foto of item.fotos) {
    try {
      await FileSystem.deleteAsync(foto.uri, { idempotent: true })
    } catch {
      // ignora se não existir ou se falhar ao apagar
    }
  }
}

export async function enfileirarPublicacao(
  rascunho: RascunhoPublicacao,
  clienteApi: ClienteApi = api,
): Promise<ItemFilaEnvio> {
  const fotosDuraveis: string[] = []
  for (const fotoUri of rascunho.fotos) {
    const salva = await copiarFotoParaDocumentos(fotoUri)
    fotosDuraveis.push(salva)
  }

  const idCliente = gerarIdCliente()
  const codigoEdicao = gerarCodigoEdicaoNoAparelho()
  const publicacao = montarPublicacao(rascunho)
  const nome = nomeDoAnimal({ especie: rascunho.animal.especie!, nome: rascunho.animal.nome ?? null })

  const novoItem = criarItemFila({
    idCliente,
    codigoEdicao,
    publicacao,
    fotos: fotosDuraveis,
    nomeAnimal: nome,
  })

  await serializarOperacaoFila(async () => {
    const filaAtual = await listarFilaInterno()
    await salvarFilaInterno([...filaAtual, novoItem])
  })

  // Depois de enfileirar, espera um passe que inclua o item novo
  await processarFila(clienteApi)

  const fila = await listarFila()
  return fila.find((f) => f.id === novoItem.id) ?? novoItem
}

async function temConexao(): Promise<boolean> {
  try {
    const estado = await Network.getNetworkStateAsync()
    return Boolean(estado.isConnected && estado.isInternetReachable !== false)
  } catch {
    return false
  }
}

/**
 * Processa itens da fila um a um na ordem certa: caso primeiro, fotos depois.
 * Toda a operação passa pela cadeia serializada de promessas.
 */
export async function processarFila(clienteApi: ClienteApi = api): Promise<void> {
  return serializarOperacaoFila(async () => {
    if (!(await temConexao())) return

    let itens = await listarFilaInterno()
    itens = recuperarItensPresosEmEnviando(itens)
    await salvarFilaInterno(itens)

    for (let i = 0; i < itens.length; i++) {
      let item = itens[i]!
      if (!podeTentar(item)) continue

      item = marcarEnviando(item)
      itens[i] = item
      await salvarFilaInterno(itens)

      if (item.etapa === 'caso' && item.publicacao) {
        try {
          const resposta = await clienteApi.publicar(item.publicacao)
          await guardarMeuCaso({
            id: resposta.id,
            tipo: resposta.tipo,
            codigoEdicao: resposta.codigoEdicao,
            nome: item.nomeAnimal,
            publicadoEm: new Date().toISOString(),
          })
          item = marcarCasoEnviado(item, resposta.id)
          if (item.estado === 'enviado') {
            await apagarFotosDoItem(item)
            item = podarItemEnviado(item)
          }
          itens[i] = item
          await salvarFilaInterno(itens)
        } catch (e) {
          const status = e instanceof ErroApi ? e.status : 0
          const mensagem = e instanceof Error ? e.message : 'Erro ao publicar caso'
          item = marcarFalhaEnvio(item, { status, mensagem })
          itens[i] = item
          await salvarFilaInterno(itens)
          continue
        }
      }

      if (item.etapa === 'fotos' && item.casoId) {
        const casoId = item.casoId
        for (const foto of item.fotos) {
          if (foto.estado === 'enviado' || foto.estado === 'falhou') continue
          try {
            const arquivo = await arquivoDaFoto(foto.uri)
            await clienteApi.enviarFoto(casoId, item.codigoEdicao, arquivo)
            item = marcarFotoEnviada(item, foto.uri)
            itens[i] = item
            await salvarFilaInterno(itens)
          } catch (e) {
            const status = e instanceof ErroApi ? e.status : 0
            const mensagem = e instanceof Error ? e.message : 'Erro ao enviar foto'
            if (ehErroPermanente(status)) {
              item = marcarFotoFalhaPermanente(item, foto.uri, mensagem)
              itens[i] = item
              await salvarFilaInterno(itens)
            } else {
              item = marcarFalhaEnvio(item, { status, mensagem })
              itens[i] = item
              await salvarFilaInterno(itens)
              break
            }
          }
        }

        if (item.estado === 'enviado') {
          await apagarFotosDoItem(item)
          item = podarItemEnviado(item)
          itens[i] = item
          await salvarFilaInterno(itens)
        }
      }
    }
  })
}

/**
 * Reenvia um item que havia falhado: zera tentativas e dispara novo passe.
 */
export async function reenviarItem(id: string, clienteApi: ClienteApi = api): Promise<void> {
  await serializarOperacaoFila(async () => {
    const fila = await listarFilaInterno()
    const atualizados = fila.map((item) => (item.id === id ? reiniciarItemFalho(item) : item))
    await salvarFilaInterno(atualizados)
  })
  void processarFila(clienteApi)
}

/**
 * Descarta um item falho da fila e apaga as fotos locais correspondentes.
 */
export async function descartarItem(id: string): Promise<void> {
  await serializarOperacaoFila(async () => {
    const fila = await listarFilaInterno()
    const item = fila.find((i) => i.id === id)
    if (item) {
      await apagarFotosDoItem(item)
    }
    const filtrados = fila.filter((i) => i.id !== id)
    await salvarFilaInterno(filtrados)
  })
}

/**
 * Observa quando a conexão com a internet volta e tenta processar a fila imediatamente.
 * Também tenta processar ao iniciar (ex: ao abrir o aplicativo).
 * Protege chamadas na web onde addNetworkStateListener pode lançar ou não existir.
 */
export function iniciarObservadorDeFila(clienteApi: ClienteApi = api): () => void {
  void processarFila(clienteApi)

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const aoFicarOnline = () => {
      void processarFila(clienteApi)
    }
    window.addEventListener('online', aoFicarOnline)
    return () => {
      window.removeEventListener('online', aoFicarOnline)
    }
  }

  try {
    const inscricao = Network.addNetworkStateListener((estado) => {
      if (estado.isConnected && estado.isInternetReachable !== false) {
        void processarFila(clienteApi)
      }
    })
    return () => {
      inscricao.remove()
    }
  } catch {
    if (typeof window !== 'undefined') {
      const aoFicarOnline = () => {
        void processarFila(clienteApi)
      }
      window.addEventListener('online', aoFicarOnline)
      return () => {
        window.removeEventListener('online', aoFicarOnline)
      }
    }
    return () => {}
  }
}
