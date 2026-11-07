import type { CasoAberto, Mural } from '@achei/contratos'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  acrescentarCasoAoCache,
  buscarCasoNoCache,
  type CasoEmCache,
  type MuralEmCache,
  type ParametrosConsultaMural,
} from '../dominio/cache-offline'

const CHAVE_MURAL = 'achei-um-bicho:cache-mural'
const CHAVE_CASOS = 'achei-um-bicho:cache-casos'

export async function salvarMuralNoCache(
  mural: Mural,
  consulta: ParametrosConsultaMural,
  agora: Date = new Date(),
): Promise<void> {
  const dados: MuralEmCache = { mural, consulta, carregadoEm: agora.toISOString() }
  await AsyncStorage.setItem(CHAVE_MURAL, JSON.stringify(dados))
}

export async function obterMuralDoCache(): Promise<MuralEmCache | null> {
  const guardado = await AsyncStorage.getItem(CHAVE_MURAL)
  if (!guardado) return null
  try {
    return JSON.parse(guardado) as MuralEmCache
  } catch {
    return null
  }
}

export async function listarCasosDoCache(): Promise<CasoEmCache[]> {
  const guardado = await AsyncStorage.getItem(CHAVE_CASOS)
  if (!guardado) return []
  try {
    const lido: unknown = JSON.parse(guardado)
    return Array.isArray(lido) ? (lido as CasoEmCache[]) : []
  } catch {
    return []
  }
}

export async function salvarCasoNoCache(caso: CasoAberto, agora: Date = new Date()): Promise<void> {
  const atuais = await listarCasosDoCache()
  const atualizados = acrescentarCasoAoCache(atuais, caso, agora)
  await AsyncStorage.setItem(CHAVE_CASOS, JSON.stringify(atualizados))
}

export async function obterCasoDoCache(id: string): Promise<CasoEmCache | null> {
  const atuais = await listarCasosDoCache()
  return buscarCasoNoCache(atuais, id) ?? null
}
