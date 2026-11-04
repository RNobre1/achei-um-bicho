import type { CasoAberto, Mural } from '@achei/contratos'

/** Limite máximo de casos abertos mantidos no aparelho (RNF3). */
export const MAXIMO_CASOS_EM_CACHE = 20

export interface MuralEmCache {
  mural: Mural
  carregadoEm: string
}

export interface CasoEmCache {
  caso: CasoAberto
  carregadoEm: string
}

/** Formata o aviso exigido pelo critério de aceite RNF3. */
export function formatarAvisoSemConexao(carregadoEm: string): string {
  const data = new Date(carregadoEm)
  const hora = String(data.getHours()).padStart(2, '0')
  const minuto = String(data.getMinutes()).padStart(2, '0')
  return `Sem conexão. Mostrando o que foi carregado às ${hora}:${minuto}.`
}

/**
 * Adiciona um caso aberto ao cache local, atualizando se já existir e limitando a
 * 20 casos no máximo (os mais recentes primeiro).
 */
export function acrescentarCasoAoCache(
  atuais: CasoEmCache[],
  novo: CasoAberto,
  agora: Date = new Date(),
): CasoEmCache[] {
  const filtrados = atuais.filter((item) => item.caso.id !== novo.id)
  const atualizado: CasoEmCache = { caso: novo, carregadoEm: agora.toISOString() }
  return [atualizado, ...filtrados].slice(0, MAXIMO_CASOS_EM_CACHE)
}

export function buscarCasoNoCache(casos: CasoEmCache[], id: string): CasoEmCache | undefined {
  return casos.find((item) => item.caso.id === id)
}
