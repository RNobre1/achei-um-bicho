import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { Platform } from 'react-native'
import { dimensoesReduzidas } from '../dominio/foto'
import type { ArquivoDeFoto } from './api'

export type OrigemDaFoto = 'camera' | 'galeria'

/** Qualidade do JPEG reduzido: nítido para ver o bicho, leve para a rede 3G da cidade. */
const COMPRESSAO = 0.6

/**
 * Abre a câmera ou a galeria e devolve a foto já reduzida e regravada em JPEG.
 * Regravar também descarta o EXIF do celular (a API tira de novo, por garantia).
 */
export async function escolherFoto(origem: OrigemDaFoto): Promise<string | undefined> {
  if (origem === 'camera') {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync()
    if (!granted) return undefined
  }
  const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false }
  const escolha =
    origem === 'camera' ? await ImagePicker.launchCameraAsync(opcoes) : await ImagePicker.launchImageLibraryAsync(opcoes)
  const foto = escolha.canceled ? undefined : escolha.assets[0]
  if (!foto) return undefined

  const tamanho = dimensoesReduzidas(foto.width, foto.height)
  const imagem = await ImageManipulator.manipulate(foto.uri).resize({ width: tamanho.largura, height: tamanho.altura }).renderAsync()
  const reduzida = await imagem.saveAsync({ compress: COMPRESSAO, format: SaveFormat.JPEG })
  return reduzida.uri
}

/** Na web o FormData quer Blob; no celular, o objeto com uri. */
export async function arquivoDaFoto(uri: string): Promise<ArquivoDeFoto> {
  if (Platform.OS === 'web') return (await fetch(uri)).blob()
  return { uri, name: 'foto.jpg', type: 'image/jpeg' }
}
