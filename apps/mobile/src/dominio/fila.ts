import type { NovaPublicacao, TipoCaso } from '@achei/contratos'
import { formatarHora } from './formatar'

/** Limite de tentativas antes de desistir de enviar sozinho. */
export const MAXIMO_TENTATIVAS = 5

/** Tempos de espera crescente entre tentativas em milissegundos: 30s, 1min, 2min, 4min, 8min. */
export const TEMPOS_ESPERA_MS = [30_000, 60_000, 120_000, 240_000, 480_000] as const

export type EstadoItemFila = 'esperando' | 'enviando' | 'enviado' | 'falhou'
export type EtapaItemFila = 'caso' | 'fotos' | 'concluido'

export interface FotoNaFila {
  uri: string
  estado: EstadoItemFila
  aviso?: string
}

export interface ItemFilaEnvio {
  id: string
  idCliente: string
  codigoEdicao: string
  tipo: TipoCaso
  nomeAnimal: string
  estado: EstadoItemFila
  etapa: EtapaItemFila
  publicacao?: NovaPublicacao
  fotos: FotoNaFila[]
  criadoEm: string
  atualizadoEm: string
  tentativas: number
  ultimoErro?: string
  casoId?: string
  proximaTentativaEm?: string
}

export interface ParametrosNovoItem {
  idCliente: string
  codigoEdicao: string
  publicacao: NovaPublicacao
  fotos: string[]
  nomeAnimal: string
  agora?: Date
}

export type ErroEnvio = string | { status: number; mensagem: string }

export type ResultadoPublicacao =
  | { tipo: 'publicado'; casoId: string; codigoEdicao: string; fotosPendentes: number }
  | { tipo: 'guardado'; idCliente: string; codigoEdicao: string; fotosPendentes: number }
  | { tipo: 'recusado'; mensagem: string }

export function ehErroPermanente(status: number): boolean {
  return status === 400 || status === 404 || status === 409 || status === 422
}

/** Cria um item novo pronto para entrar na fila em disco. */
export function criarItemFila({
  idCliente,
  codigoEdicao,
  publicacao,
  fotos,
  nomeAnimal,
  agora = new Date(),
}: ParametrosNovoItem): ItemFilaEnvio {
  const agoraIso = agora.toISOString()
  return {
    id: idCliente,
    idCliente,
    codigoEdicao,
    tipo: publicacao.tipo,
    nomeAnimal,
    estado: 'esperando',
    etapa: 'caso',
    publicacao: {
      ...publicacao,
      idCliente,
      codigoEdicao,
    },
    fotos: fotos.map((uri) => ({ uri, estado: 'esperando' })),
    criadoEm: agoraIso,
    atualizadoEm: agoraIso,
    tentativas: 0,
  }
}

export type ProximoPasso =
  | { tipo: 'caso'; publicacao: NovaPublicacao }
  | { tipo: 'foto'; uri: string }
  | null

/**
 * Ordem do envio: o caso sobe sempre antes das fotos. Se o caso falhar, nenhuma foto
 * é enviada; se uma foto falhar, o caso já existe e a foto pode subir depois.
 */
export function proximoPassoEnvio(item: ItemFilaEnvio): ProximoPasso {
  if (item.etapa === 'caso' && item.publicacao) {
    return { tipo: 'caso', publicacao: item.publicacao }
  }
  if (item.etapa === 'fotos') {
    const fotoPendente = item.fotos.find((f) => f.estado === 'esperando')
    if (fotoPendente) return { tipo: 'foto', uri: fotoPendente.uri }
  }
  return null
}

export function marcarEnviando(item: ItemFilaEnvio, agora: Date = new Date()): ItemFilaEnvio {
  return {
    ...item,
    estado: 'enviando',
    atualizadoEm: agora.toISOString(),
  }
}

export function marcarCasoEnviado(
  item: ItemFilaEnvio,
  casoId: string,
  agora: Date = new Date(),
): ItemFilaEnvio {
  const agoraIso = agora.toISOString()
  const temFotos = item.fotos.length > 0
  return {
    ...item,
    casoId,
    etapa: temFotos ? 'fotos' : 'concluido',
    estado: temFotos ? 'esperando' : 'enviado',
    atualizadoEm: agoraIso,
  }
}

export function marcarFotoEnviada(
  item: ItemFilaEnvio,
  uri: string,
  agora: Date = new Date(),
): ItemFilaEnvio {
  const agoraIso = agora.toISOString()
  const fotosAtualizadas = item.fotos.map((f) => (f.uri === uri ? { ...f, estado: 'enviado' as const } : f))
  const todasConcluidas = fotosAtualizadas.every((f) => f.estado === 'enviado' || f.estado === 'falhou')
  return {
    ...item,
    fotos: fotosAtualizadas,
    etapa: todasConcluidas ? 'concluido' : 'fotos',
    estado: todasConcluidas ? 'enviado' : 'esperando',
    atualizadoEm: agoraIso,
  }
}

export function marcarFotoFalhaPermanente(
  item: ItemFilaEnvio,
  uri: string,
  aviso: string,
  agora: Date = new Date(),
): ItemFilaEnvio {
  const agoraIso = agora.toISOString()
  const fotosAtualizadas = item.fotos.map((f) => (f.uri === uri ? { ...f, estado: 'falhou' as const, aviso } : f))
  const todasConcluidas = fotosAtualizadas.every((f) => f.estado === 'enviado' || f.estado === 'falhou')
  return {
    ...item,
    fotos: fotosAtualizadas,
    etapa: todasConcluidas ? 'concluido' : 'fotos',
    estado: todasConcluidas ? 'enviado' : 'esperando',
    atualizadoEm: agoraIso,
  }
}

/**
 * Ao falhar um envio:
 * - Se permanente (400, 404, 409, 422): vai direto para 'falhou' e guarda a mensagem.
 * - Se passageiro (status 0, 429, 5xx): conta tentativa, calcula espera exponencial e fica em 'esperando'.
 *   Na 5ª falha, esgota e vai a 'falhou'.
 */
export function marcarFalhaEnvio(
  item: ItemFilaEnvio,
  erro: ErroEnvio,
  agora: Date = new Date(),
): ItemFilaEnvio {
  const status = typeof erro === 'object' ? erro.status : 0
  const mensagem = typeof erro === 'object' ? erro.mensagem : erro
  const agoraIso = agora.toISOString()

  if (ehErroPermanente(status)) {
    return {
      ...item,
      estado: 'falhou',
      ultimoErro: mensagem,
      proximaTentativaEm: undefined,
      atualizadoEm: agoraIso,
    }
  }

  const tentativas = item.tentativas + 1
  const esgotou = tentativas >= MAXIMO_TENTATIVAS

  if (esgotou) {
    return {
      ...item,
      tentativas,
      estado: 'falhou',
      ultimoErro: mensagem,
      proximaTentativaEm: undefined,
      atualizadoEm: agoraIso,
    }
  }

  const indiceEspera = Math.min(tentativas - 1, TEMPOS_ESPERA_MS.length - 1)
  const esperaMs = TEMPOS_ESPERA_MS[indiceEspera] ?? 480_000
  const proximaTentativaEm = new Date(agora.getTime() + esperaMs).toISOString()

  return {
    ...item,
    tentativas,
    estado: 'esperando',
    ultimoErro: mensagem,
    proximaTentativaEm,
    atualizadoEm: agoraIso,
  }
}

/**
 * Desfaz estado "enviando" de itens que ficaram presos se o app fechou no meio.
 */
export function recuperarItensPresosEmEnviando(itens: ItemFilaEnvio[]): ItemFilaEnvio[] {
  return itens.map((item) => (item.estado === 'enviando' ? { ...item, estado: 'esperando' } : item))
}

/**
 * Verifica se um item pode ser tentado agora.
 * Deve estar em 'esperando', não ter esgotado as tentativas e, se tiver proximaTentativaEm,
 * esse horário já deve ter chegado.
 */
export function podeTentar(item: ItemFilaEnvio, agora: Date = new Date()): boolean {
  if (item.estado !== 'esperando') return false
  if (item.tentativas >= MAXIMO_TENTATIVAS) return false
  if (item.proximaTentativaEm && new Date(item.proximaTentativaEm).getTime() > agora.getTime()) {
    return false
  }
  return true
}

/** Quando a conexão volta, tenta os itens que estão aptos para envio. */
export function quandoConexaoVolta(itens: ItemFilaEnvio[], agora: Date = new Date()): ItemFilaEnvio[] {
  return itens.filter((i) => podeTentar(i, agora))
}

/**
 * Na tela da fila, "Tentar enviar de novo" zera tentativas e espera e põe o item em esperando.
 */
export function reiniciarItemFalho(item: ItemFilaEnvio, agora: Date = new Date()): ItemFilaEnvio {
  return {
    ...item,
    estado: 'esperando',
    tentativas: 0,
    ultimoErro: undefined,
    proximaTentativaEm: undefined,
    atualizadoEm: agora.toISOString(),
  }
}

/**
 * Extrai o resultado da publicação para informar a tela com a verdade:
 * - 'publicado': caso confirmado na API (com casoId)
 * - 'recusado': rejeitado com erro permanente
 * - 'guardado': salvo localmente aguardando conexão
 */
export function resultadoDaPublicacao(item: ItemFilaEnvio): ResultadoPublicacao {
  if (item.casoId) {
    const fotosPendentes = item.fotos.filter((f) => f.estado !== 'enviado').length
    return {
      tipo: 'publicado',
      casoId: item.casoId,
      codigoEdicao: item.codigoEdicao,
      fotosPendentes,
    }
  }
  if (item.estado === 'falhou') {
    return {
      tipo: 'recusado',
      mensagem: item.ultimoErro ?? 'Não foi possível salvar o caso.',
    }
  }
  return {
    tipo: 'guardado',
    idCliente: item.idCliente,
    codigoEdicao: item.codigoEdicao,
    fotosPendentes: item.fotos.filter((f) => f.estado !== 'enviado').length,
  }
}

/**
 * Poda item enviado: mantém id do caso, título curto, estado e horário.
 * Saem publicação (ponto exato, telefone, código) e fotos locais.
 */
export function podarItemEnviado(item: ItemFilaEnvio): ItemFilaEnvio {
  if (item.estado !== 'enviado') return item
  return {
    ...item,
    publicacao: undefined,
    fotos: [],
  }
}

/**
 * Verifica se existem itens ainda pendentes (não enviados) na fila.
 */
export function temItensPendentes(itens: ItemFilaEnvio[]): boolean {
  return itens.some((item) => item.estado !== 'enviado')
}

export function descreverEstadoItem(item: ItemFilaEnvio): string {
  if (item.estado === 'enviado') return 'Publicado'
  if (item.estado === 'enviando') {
    return item.etapa === 'caso' ? 'Enviando caso…' : 'Enviando fotos…'
  }
  if (item.estado === 'falhou') {
    return item.ultimoErro ?? 'Não foi possível enviar'
  }
  return item.tentativas === 0 ? 'Esperando conexão' : 'Aguardando para tentar de novo'
}

/** Horário simples no formato HH:mm para exibir na fila usando o formatador único. */
export function formatarHorarioFila(dataIso: string): string {
  return formatarHora(dataIso)
}
