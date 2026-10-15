import * as Location from 'expo-location'
import { localizar, POSICAO_GUARDADA, type Posicao } from '../dominio/posicao'

export function obterPosicao(): Promise<Posicao> {
  return localizar({
    async pedirPermissao() {
      const { status } = await Location.requestForegroundPermissionsAsync()
      return status === 'granted'
    },
    async posicaoAtual() {
      const atual = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      return { latitude: atual.coords.latitude, longitude: atual.coords.longitude }
    },
    async ultimaPosicao() {
      const guardada = await Location.getLastKnownPositionAsync({
        maxAge: POSICAO_GUARDADA.idadeMaximaMs,
        requiredAccuracy: POSICAO_GUARDADA.precisaoMinimaM,
      })
      return guardada ? { latitude: guardada.coords.latitude, longitude: guardada.coords.longitude } : undefined
    },
  })
}
