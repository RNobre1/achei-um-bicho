import Constants from 'expo-constants'
import { useState } from 'react'
import { Image, Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import { formatarDistancia } from '../dominio/formatar'
import { cabecalhosDosLadrilhos, fonteDoLadrilho, montarMapa } from '../dominio/mapa'
import type { Coordenada } from '../dominio/posicao'
import { cores, fontes } from '../tema'

const LADRILHOS = process.env.EXPO_PUBLIC_TILES_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
// a versão vem do app.json, a mesma que o APK mostra nas configurações do Android
const CABECALHOS = cabecalhosDosLadrilhos(Constants.expoConfig?.version ?? '0')

interface Props {
  centro: Coordenada
  raioM: number
  altura?: number
  /** Quando existe, o mapa vira um botão (a tela do caso abre a área no Google Maps). */
  aoTocar?: () => void
}

/** Círculo da área aproximada sobre o mapa. Nunca um pino no endereço exato. */
export function MapaArea({ centro, raioM, altura = 150, aoTocar }: Props) {
  const [largura, setLargura] = useState(0)
  const mapa = largura > 0 ? montarMapa({ centro, raioM, largura, altura, modeloUrl: LADRILHOS }) : undefined

  return (
    <Pressable
      disabled={!aoTocar}
      onPress={aoTocar}
      style={[estilos.mapa, { height: altura }]}
      onLayout={(e: LayoutChangeEvent) => setLargura(Math.round(e.nativeEvent.layout.width))}
      accessibilityRole={aoTocar ? 'link' : undefined}
      accessibilityLabel={`Mapa com a área aproximada, raio de ${formatarDistancia(raioM)}`}
      accessibilityHint={aoTocar ? 'Abre a área no Google Maps' : undefined}
    >
      {mapa?.ladrilhos.map((l) => (
        <Image
          key={l.url}
          source={fonteDoLadrilho(l.url, CABECALHOS, Platform.OS)}
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
      {aoTocar ? <Text style={[estilos.etiqueta, estilos.abrir]}>ABRIR NO MAPA ↗</Text> : null}
    </Pressable>
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
  abrir: { right: 8, top: 8 },
})
