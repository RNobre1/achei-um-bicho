import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  acrescentarReivindicacao,
  lerMinhasReivindicacoes,
  type MinhaReivindicacao,
} from '../dominio/minhas-reivindicacoes'

const CHAVE = 'achei-um-bicho:minhas-reivindicacoes'

export async function listarMinhasReivindicacoes(): Promise<MinhaReivindicacao[]> {
  return lerMinhasReivindicacoes(await AsyncStorage.getItem(CHAVE))
}

export async function guardarMinhaReivindicacao(reivindicacao: MinhaReivindicacao): Promise<void> {
  const lista = acrescentarReivindicacao(await listarMinhasReivindicacoes(), reivindicacao)
  await AsyncStorage.setItem(CHAVE, JSON.stringify(lista))
}

export async function minhaReivindicacao(id: string): Promise<MinhaReivindicacao | undefined> {
  return (await listarMinhasReivindicacoes()).find((r) => r.id === id)
}
