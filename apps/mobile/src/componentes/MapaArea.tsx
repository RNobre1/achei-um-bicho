import Constants from 'expo-constants'
import { useState } from 'react'
import { Image, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import { formatarDistancia } from '../dominio/formatar'
import { cabecalhosDosLadrilhos, montarMapa } from '../dominio/mapa'
import type { Coordenada } from '../dominio/posicao'
import { cores, fontes } from '../tema'

const LADRILHOS = process.env.EXPO_PUBLIC_TILES_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
// a versão vem do app.json, a mesma que o APK mostra nas configurações do Android
const CABECALHOS = cabecalhosDosLadrilhos(Constants.expoConfig?.version ?? '0')

interface Props {
  centro: Coordenada
  raioM: number
  altura?: number
}

/** Círculo da área aproximada sobre o mapa. Nunca um pino no endereço exato. */
export function MapaArea({ centro, raioM, altura = 150 }: Props) {
  const [largura, setLargura] = useState(0)
  const mapa = largura > 0 ? montarMapa({ centro, raioM, largura, altura, modeloUrl: LADRILHOS }) : undefined

  return (
    <View
      style={[estilos.mapa, { height: altura }]}
      onLayout={(e: LayoutChangeEvent) => setLargura(Math.round(e.nativeEvent.layout.width))}
      accessibilityLabel={`Mapa com a área aproximada, raio de ${formatarDistancia(raioM)}`}
    >
      {mapa?.ladrilhos.map((l) => (
        <Image
          key={l.url}
          source={{ uri: l.url, headers: CABECALHOS }}
          style={[estilos.ladrilho, { left: l.esquerda, top: l.topo }]}
        />
      ))}
      {mapa ? (
        <View
          style={[
            estilos.circulo,
            {
              left: mapa.circulo.x - mapa.circulo.raio,
              top: mapa.circulo.y - mapa.circulo.raio,
              width: mapa.circulo.raio * 2,
              height: mapa.circulo.raio * 2,
              borderRadius: mapa.circulo.raio,
            },
          ]}
        />
      ) : null}
      <Text style={[estilos.etiqueta, estilos.etiquetaArea]}>
        ÁREA APROXIMADA · {formatarDistancia(raioM).toUpperCase()}
      </Text>
      <Text style={[estilos.etiqueta, estilos.atribuicao]}>© OpenStreetMap</Text>
    </View>
  )
}

const estilos = StyleSheet.create({
  mapa: { overflow: 'hidden', backgroundColor: '#E4E8E3', borderWidth: 1, borderColor: cores.traco },
  ladrilho: { position: 'absolute', width: 256, height: 256 },
  circulo: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: cores.perdi,
    backgroundColor: 'rgba(47,133,135,0.16)',
  },
  etiqueta: {
    position: 'absolute',
    fontFamily: fontes.dado,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: cores.texto,
    backgroundColor: 'rgba(238,242,238,0.9)',
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  etiquetaArea: { right: 8, bottom: 8 },
  atribuicao: { left: 8, top: 8, letterSpacing: 0 },
})
