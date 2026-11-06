import type { CasoAberto, Mural, TipoCaso } from '@achei/contratos'
import { formatarHora } from './formatar'

/** Limite máximo de casos abertos mantidos no aparelho (RNF3). */
export const MAXIMO_CASOS_EM_CACHE = 20

/** Distância máxima em metros do centro da busca para considerar a mesma busca no cache. */
export const DISTANCIA_MAXIMA_MESMA_BUSCA_M = 200

export const MENSAGEM_SEM_CONEXAO_SEM_CACHE = 'Sem conexão e nada guardado para esta busca'

export interface CoordenadaConsulta {
  latitude: number
  longitude: number
}

export interface ParametrosConsultaMural {
  centro: CoordenadaConsulta
  raio: number
  tipo?: TipoCaso
}

export interface MuralEmCache {
  mural: Mural
  consulta: ParametrosConsultaMural
  carregadoEm: string
}

export interface CasoEmCache {
  caso: CasoAberto
  carregadoEm: string
}

export interface ErroComStatus {
  status: number
  mensagem?: string
}

export type DecisaoCacheMural =
  | { usarCache: true; mural: Mural; aviso: string }
  | { usarCache: false; erro: string }

export type DecisaoCacheCaso =
  | { usarCache: true; caso: CasoAberto; aviso: string }
  | { usarCache: false; erro: string }

/** Distância em metros entre dois pontos geográficos (fórmula de haversine). */
export function distanciaEmMetros(a: CoordenadaConsulta, b: CoordenadaConsulta): number {
  const rad = Math.PI / 180
  const dLat = (b.latitude - a.latitude) * rad
  const dLon = (b.longitude - a.longitude) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}

/** Formata o aviso exigido pelo critério de aceite RNF3. */
export function formatarAvisoSemConexao(carregadoEm: string): string {
  return `Sem conexão. Mostrando o que foi carregado às ${formatarHora(carregadoEm)}.`
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

/**
 * Decide se o cache do mural pode ser usado em caso de falha.
 * O cache é usado só quando o erro tem status === 0 (falta de conexão).
 * Deve corresponder à mesma busca: mesmo tipo, mesmo raio e centro até 200 m.
 */
export function decidirCacheMural(
  erro: ErroComStatus,
  consultaAtual: ParametrosConsultaMural,
  cache: MuralEmCache | null,
): DecisaoCacheMural {
  if (erro.status !== 0) {
    return {
      usarCache: false,
      erro: erro.mensagem || 'Não deu para carregar os casos.',
    }
  }

  if (!cache) {
    return {
      usarCache: false,
      erro: MENSAGEM_SEM_CONEXAO_SEM_CACHE,
    }
  }

  const mesmoTipo = cache.consulta.tipo === consultaAtual.tipo
  const mesmoRaio = cache.consulta.raio === consultaAtual.raio
  const distancia = distanciaEmMetros(cache.consulta.centro, consultaAtual.centro)

  if (mesmoTipo && mesmoRaio && distancia <= DISTANCIA_MAXIMA_MESMA_BUSCA_M) {
    return {
      usarCache: true,
      mural: cache.mural,
      aviso: formatarAvisoSemConexao(cache.carregadoEm),
    }
  }

  return {
    usarCache: false,
    erro: MENSAGEM_SEM_CONEXAO_SEM_CACHE,
  }
}

/**
 * Decide se o cache de um caso aberto pode ser usado em caso de falha.
 * Só usa cache se status === 0. Erro 404 indica que o caso não existe mais.
 */
export function decidirCacheCaso(
  erro: ErroComStatus,
  _id: string,
  cache: CasoEmCache | null | undefined,
): DecisaoCacheCaso {
  if (erro.status !== 0) {
    const mensagem =
      erro.status === 404
        ? 'Este caso não existe mais ou o link está errado.'
        : erro.mensagem || 'Não deu para abrir o caso.'
    return {
      usarCache: false,
      erro: mensagem,
    }
  }

  if (!cache) {
    return {
      usarCache: false,
      erro: 'Sem conexão e este caso não está guardado no celular.',
    }
  }

  return {
    usarCache: true,
    caso: cache.caso,
    aviso: formatarAvisoSemConexao(cache.carregadoEm),
  }
}
