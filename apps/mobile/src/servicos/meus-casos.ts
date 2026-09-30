import AsyncStorage from '@react-native-async-storage/async-storage'
import { acrescentarCaso, lerMeusCasos, type MeuCaso } from '../dominio/meus-casos'

const CHAVE = 'achei-um-bicho:meus-casos'

export async function listarMeusCasos(): Promise<MeuCaso[]> {
  return lerMeusCasos(await AsyncStorage.getItem(CHAVE))
}

export async function guardarMeuCaso(caso: MeuCaso): Promise<void> {
  const lista = acrescentarCaso(await listarMeusCasos(), caso)
  await AsyncStorage.setItem(CHAVE, JSON.stringify(lista))
}

export async function meuCaso(id: string): Promise<MeuCaso | undefined> {
  return (await listarMeusCasos()).find((caso) => caso.id === id)
}
