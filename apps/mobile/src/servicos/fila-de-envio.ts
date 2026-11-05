import { CODIGO_EDICAO } from '@achei/contratos'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import * as Network from 'expo-network'
import {
  criarItemFila,
  marcarCasoEnviado,
  marcarEnviando,
  marcarFalhaEnvio,
  marcarFotoEnviada,
  podeTentar,
  type ItemFilaEnvio,
} from '../dominio/fila'
import { nomeDoAnimal } from '../dominio/mural'
import { montarPublicacao, type RascunhoPublicacao } from '../dominio/publicacao'
import { api, type ClienteApi } from './api'
import { arquivoDaFoto } from './fotos'
import { guardarMeuCaso } from './meus-casos'

const CHAVE_STORAGE = 'achei-um-bicho:fila-de-envio'

/**
 * Sorteia o código de edição no próprio aparelho com gerador criptográfico do sistema
 * operacional (expo-crypto), sem depender de internet para obter o código (F9).
 */
export function gerarCodigoEdicaoNoAparelho(): string {
  const bytes = Crypto.getRandomBytes(CODIGO_EDICAO.tamanhoBloco * 2)
  let bloco1 = ''
  let bloco2 = ''
  for (let i = 0; i < CODIGO_EDICAO.tamanhoBloco; i++) {
    bloco1 += CODIGO_EDICAO.alfabeto[bytes[i]! % CODIGO_EDICAO.alfabeto.length]
    bloco2 += CODIGO_EDICAO.alfabeto[bytes[i + CODIGO_EDICAO.tamanhoBloco]! % CODIGO_EDICAO.alfabeto.length]
  }
  return `${bloco1}-${bloco2}`
}

export function gerarIdCliente(): string {
  return Crypto.randomUUID()
}

export async function listarFila(): Promise<ItemFilaEnvio[]> {
  const guardado = await AsyncStorage.getItem(CHAVE_STORAGE)
  if (!guardado) return []
  try {
    const lido: unknown = JSON.parse(guardado)
    return Array.isArray(lido) ? (lido as ItemFilaEnvio[]) : []
  } catch {
    return []
  }
}

export async function salvarFila(itens: ItemFilaEnvio[]): Promise<void> {
  await AsyncStorage.setItem(CHAVE_STORAGE, JSON.stringify(itens))
}

export async function enfileirarPublicacao(
  rascunho: RascunhoPublicacao,
  clienteApi: ClienteApi = api,
): Promise<ItemFilaEnvio> {
  const idCliente = gerarIdCliente()
  const codigoEdicao = gerarCodigoEdicaoNoAparelho()
  const publicacao = montarPublicacao(rascunho)
  const nome = nomeDoAnimal({ especie: rascunho.animal.especie!, nome: rascunho.animal.nome ?? null })

  const novoItem = criarItemFila({
    idCliente,
    codigoEdicao,
    publicacao,
    fotos: rascunho.fotos,
    nomeAnimal: nome,
  })

  const filaAtual = await listarFila()
  await salvarFila([...filaAtual, novoItem])

  return novoItem
}

let promessaEmExecucao: Promise<void> | null = null

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
 * Se a conexão falhar ou o servidor rejeitar, anota o erro e espera para tentar de novo.
 */
export async function processarFila(clienteApi: ClienteApi = api): Promise<void> {
  if (promessaEmExecucao) return promessaEmExecucao

  promessaEmExecucao = (async () => {
    try {
      if (!(await temConexao())) return

      let itens = await listarFila()
      for (let i = 0; i < itens.length; i++) {
        let item = itens[i]!
        if (!podeTentar(item)) continue

        item = marcarEnviando(item)
        itens[i] = item
        await salvarFila(itens)

        if (item.etapa === 'caso') {
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
            itens[i] = item
            await salvarFila(itens)
          } catch (e) {
            const mensagem = e instanceof Error ? e.message : 'Erro ao publicar caso'
            item = marcarFalhaEnvio(item, mensagem)
            itens[i] = item
            await salvarFila(itens)
            continue
          }
        }

        if (item.etapa === 'fotos' && item.casoId) {
          const casoId = item.casoId
          for (const foto of item.fotos) {
            if (foto.estado === 'enviado') continue
            try {
              const arquivo = await arquivoDaFoto(foto.uri)
              await clienteApi.enviarFoto(casoId, item.codigoEdicao, arquivo)
              item = marcarFotoEnviada(item, foto.uri)
              itens[i] = item
              await salvarFila(itens)
            } catch (e) {
              const mensagem = e instanceof Error ? e.message : 'Erro ao enviar foto'
              item = marcarFalhaEnvio(item, mensagem)
              itens[i] = item
              await salvarFila(itens)
              break
            }
          }
        }
      }
    } finally {
      promessaEmExecucao = null
    }
  })()

  return promessaEmExecucao
}

/**
 * Observa quando a conexão com a internet volta e tenta processar a fila imediatamente.
 * Também tenta processar ao iniciar (ex: ao abrir o aplicativo).
 */
export function iniciarObservadorDeFila(clienteApi: ClienteApi = api): () => void {
  void processarFila(clienteApi)

  const inscricao = Network.addNetworkStateListener((estado) => {
    if (estado.isConnected && estado.isInternetReachable !== false) {
      void processarFila(clienteApi)
    }
  })

  return () => {
    inscricao.remove()
  }
}
