import { CODIGO_EDICAO, gerarCodigoEdicao } from '@achei/contratos'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'
import * as Network from 'expo-network'
import { AppState, Platform } from 'react-native'
import {
  criarItemFila,
  ehErroPermanente,
  MAXIMO_TENTATIVAS,
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
import { api, statusDoErro, type ClienteApi } from './api'
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
    const limite = 256 - (256 % max)
    let byte: number
    do {
      byte = Crypto.getRandomBytes(1)[0]!
    } while (byte >= limite)
    return byte % max
  })
}

export function gerarIdCliente(): string {
  return Crypto.randomUUID()
}

/** Cadeia curta de promessas para manter atômicas as operações locais da fila. */
let cadeiaArmazenamento: Promise<unknown> = Promise.resolve()

export function serializarOperacaoFila<T>(operacao: () => Promise<T>): Promise<T> {
  const proxima = cadeiaArmazenamento.then(operacao, operacao)
  cadeiaArmazenamento = proxima.then(
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

async function alterarFila<T>(
  alterar: (itens: ItemFilaEnvio[]) => { itens: ItemFilaEnvio[]; resultado: T },
): Promise<T> {
  return serializarOperacaoFila(async () => {
    const filaAtual = await listarFilaInterno()
    const { itens, resultado } = alterar(filaAtual)
    await salvarFilaInterno(itens)
    return resultado
  })
}

async function atualizarItemFila(
  id: string,
  atualizar: (item: ItemFilaEnvio) => ItemFilaEnvio,
): Promise<ItemFilaEnvio | undefined> {
  return alterarFila((filaAtual) => {
    const indice = filaAtual.findIndex((item) => item.id === id)
    if (indice < 0) return { itens: filaAtual, resultado: undefined }

    const item = atualizar(filaAtual[indice]!)
    const filaAtualizada = [...filaAtual]
    filaAtualizada[indice] = item
    return { itens: filaAtualizada, resultado: item }
  })
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

  await alterarFila((filaAtual) => ({
    itens: [...filaAtual, novoItem],
    resultado: undefined,
  }))

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

/** Processa um snapshot de ids; cada alteração relê e grava a fila sob trava curta. */
async function executarPasse(clienteApi: ClienteApi): Promise<void> {
  if (!(await temConexao())) return

  await alterarFila((filaAtual) => ({
    itens: recuperarItensPresosEmEnviando(filaAtual),
    resultado: undefined,
  }))
  const ids = (await listarFila()).map((item) => item.id)

  for (const id of ids) {
    let item = await alterarFila((filaAtual) => {
      const indice = filaAtual.findIndex((candidato) => candidato.id === id)
      if (indice < 0 || !podeTentar(filaAtual[indice]!)) {
        return { itens: filaAtual, resultado: undefined }
      }

      const atualizados = [...filaAtual]
      const enviando = marcarEnviando(filaAtual[indice]!)
      atualizados[indice] = enviando
      return { itens: atualizados, resultado: enviando }
    })
    if (!item) continue

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
        const atualizado = await atualizarItemFila(id, (atual) => marcarCasoEnviado(atual, resposta.id))
        if (!atualizado) continue
        item = atualizado
        if (item.estado === 'enviado') {
          await apagarFotosDoItem(item)
          const podado = await atualizarItemFila(id, podarItemEnviado)
          if (!podado) continue
          item = podado
        }
      } catch (e) {
        const status = statusDoErro(e)
        const mensagem = e instanceof Error ? e.message : 'Erro ao publicar caso'
        await atualizarItemFila(id, (atual) => marcarFalhaEnvio(atual, { status, mensagem }))
        continue
      }
    }

    if (item.etapa === 'fotos' && item.casoId) {
      const casoId = item.casoId
      for (const fotoOriginal of item.fotos) {
        const foto = item.fotos.find((candidata) => candidata.uri === fotoOriginal.uri)
        if (!foto || foto.estado === 'enviado' || foto.estado === 'falhou') continue
        try {
          const arquivo = await arquivoDaFoto(foto.uri)
          await clienteApi.enviarFoto(casoId, item.codigoEdicao, arquivo)
          const atualizado = await atualizarItemFila(id, (atual) => marcarFotoEnviada(atual, foto.uri))
          if (!atualizado) break
          item = atualizado
        } catch (e) {
          const status = statusDoErro(e)
          const mensagem = e instanceof Error ? e.message : 'Erro ao enviar foto'
          if (ehErroPermanente(status)) {
            const atualizado = await atualizarItemFila(id, (atual) =>
              marcarFotoFalhaPermanente(atual, foto.uri, mensagem),
            )
            if (!atualizado) break
            item = atualizado
          } else {
            const atualizado = await atualizarItemFila(id, (atual) => marcarFalhaEnvio(atual, { status, mensagem }))
            if (!atualizado) break
            item = atualizado
            break
          }
        }
      }

      if (item.estado === 'enviado') {
        await apagarFotosDoItem(item)
        await atualizarItemFila(id, podarItemEnviado)
      }
    }
  }
}

/** Mantém um passe de rede por vez; novos pedidos durante um passe solicitam outro. */
let passeEmAndamento: Promise<void> | undefined
let passeSolicitado = false

export function processarFila(clienteApi: ClienteApi = api): Promise<void> {
  if (passeEmAndamento) {
    passeSolicitado = true
    return passeEmAndamento
  }

  let promessa: Promise<void>
  const execucao = (async () => {
    do {
      passeSolicitado = false
      await executarPasse(clienteApi)
    } while (passeSolicitado)
  })()
  promessa = execucao.finally(() => {
    if (passeEmAndamento === promessa) passeEmAndamento = undefined
  })
  passeEmAndamento = promessa
  return promessa
}

/**
 * Reenvia um item que havia falhado: zera tentativas e dispara novo passe.
 */
export async function reenviarItem(id: string, clienteApi: ClienteApi = api): Promise<void> {
  await alterarFila((filaAtual) => ({
    itens: filaAtual.map((item) => (item.id === id ? reiniciarItemFalho(item) : item)),
    resultado: undefined,
  }))
  await processarFila(clienteApi)
}

/**
 * Descarta um item falho da fila e apaga as fotos locais correspondentes.
 */
export async function descartarItem(id: string): Promise<void> {
  const removido = await alterarFila((filaAtual) => ({
    itens: filaAtual.filter((item) => item.id !== id),
    resultado: filaAtual.find((item) => item.id === id),
  }))
  if (removido) await apagarFotosDoItem(removido)
}

/**
 * Observa quando a conexão com a internet volta e tenta processar a fila imediatamente.
 * Também tenta processar ao iniciar (ex: ao abrir o aplicativo).
 * Protege chamadas na web onde addNetworkStateListener pode lançar ou não existir.
 */
export function iniciarObservadorDeFila(clienteApi: ClienteApi = api): () => void {
  let encerrado = false
  let timer: ReturnType<typeof setTimeout> | undefined

  async function agendarProximaTentativa() {
    if (encerrado) return
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined

    const agora = Date.now()
    const horarios = (await listarFila())
      .filter((item) => item.estado === 'esperando' && item.tentativas < MAXIMO_TENTATIVAS && item.proximaTentativaEm)
      .map((item) => new Date(item.proximaTentativaEm!).getTime())
      .filter((horario) => Number.isFinite(horario) && horario > agora)
    if (encerrado || horarios.length === 0) return

    const proximaTentativa = Math.min(...horarios)
    timer = setTimeout(() => {
      timer = undefined
      void processarFila(clienteApi)
        .catch(() => undefined)
        .finally(() => {
          void agendarProximaTentativa().catch(() => undefined)
        })
    }, proximaTentativa - agora)
  }

  function processarEAgendar() {
    void processarFila(clienteApi)
      .catch(() => undefined)
      .finally(() => {
        void agendarProximaTentativa().catch(() => undefined)
      })
  }

  const inscricaoAppState = AppState.addEventListener('change', (estado) => {
    if (estado === 'active') processarEAgendar()
  })
  const aoFicarOnline = () => processarEAgendar()
  let inscricaoRede: ReturnType<typeof Network.addNetworkStateListener> | undefined
  let ouvirOnline = false

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('online', aoFicarOnline)
    ouvirOnline = true
  } else {
    try {
      inscricaoRede = Network.addNetworkStateListener((estado) => {
        if (estado.isConnected && estado.isInternetReachable !== false) processarEAgendar()
      })
    } catch {
      if (typeof window !== 'undefined') {
        window.addEventListener('online', aoFicarOnline)
        ouvirOnline = true
      }
    }
  }

  processarEAgendar()

  return () => {
    encerrado = true
    if (timer !== undefined) clearTimeout(timer)
    inscricaoAppState.remove()
    inscricaoRede?.remove()
    if (ouvirOnline && typeof window !== 'undefined') {
      window.removeEventListener('online', aoFicarOnline)
    }
  }
}
