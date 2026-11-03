import type { NovaPublicacao, TipoCaso } from '@achei/contratos'

/** Limite de tentativas antes de desistir de enviar sozinho. */
export const MAXIMO_TENTATIVAS = 5

export type EstadoItemFila = 'esperando' | 'enviando' | 'enviado' | 'falhou'
export type EtapaItemFila = 'caso' | 'fotos' | 'concluido'

export interface FotoNaFila {
  uri: string
  estado: EstadoItemFila
}

export interface ItemFilaEnvio {
  id: string
  idCliente: string
  codigoEdicao: string
  tipo: TipoCaso
  nomeAnimal: string
  estado: EstadoItemFila
  etapa: EtapaItemFila
  publicacao: NovaPublicacao
  fotos: FotoNaFila[]
  criadoEm: string
  atualizadoEm: string
  tentativas: number
  ultimoErro?: string
  casoId?: string
}

export interface ParametrosNovoItem {
  idCliente: string
  codigoEdicao: string
  publicacao: NovaPublicacao
  fotos: string[]
  nomeAnimal: string
  agora?: Date
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
  if (item.etapa === 'caso') {
    return { tipo: 'caso', publicacao: item.publicacao }
  }
  if (item.etapa === 'fotos') {
    const fotoPendente = item.fotos.find((f) => f.estado !== 'enviado')
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
  const todasEnviadas = fotosAtualizadas.every((f) => f.estado === 'enviado')
  return {
    ...item,
    fotos: fotosAtualizadas,
    etapa: todasEnviadas ? 'concluido' : 'fotos',
    estado: todasEnviadas ? 'enviado' : 'esperando',
    atualizadoEm: agoraIso,
  }
}

export function marcarFalhaEnvio(
  item: ItemFilaEnvio,
  erro: string,
  agora: Date = new Date(),
): ItemFilaEnvio {
  const tentativas = item.tentativas + 1
  const esgotou = tentativas >= MAXIMO_TENTATIVAS
  return {
    ...item,
    tentativas,
    ultimoErro: erro,
    estado: esgotou ? 'falhou' : 'esperando',
    atualizadoEm: agora.toISOString(),
  }
}

export function podeTentar(item: ItemFilaEnvio): boolean {
  return item.estado === 'esperando' && item.tentativas < MAXIMO_TENTATIVAS
}

/** Quando a conexão volta, tenta os itens que ainda não esgotaram as tentativas. */
export function quandoConexaoVolta(itens: ItemFilaEnvio[]): ItemFilaEnvio[] {
  return itens.filter(podeTentar)
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

/** Horário simples no formato HH:mm para exibir na fila. */
export function formatarHorarioFila(dataIso: string): string {
  const data = new Date(dataIso)
  const hora = String(data.getHours()).padStart(2, '0')
  const minuto = String(data.getMinutes()).padStart(2, '0')
  return `${hora}:${minuto}`
}
