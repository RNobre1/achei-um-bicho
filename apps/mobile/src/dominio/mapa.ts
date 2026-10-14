import type { Coordenada } from './posicao'

/**
 * Mapa da área aproximada montado com ladrilhos de imagem, sem biblioteca nativa de
 * mapa: roda igual no Expo Go, no aparelho e na web, e baixa só os três ou quatro
 * ladrilhos que aparecem. A projeção é a Web Mercator, a mesma do OpenStreetMap.
 */

export const TAMANHO_LADRILHO = 256

const CIRCUNFERENCIA_EQUADOR_M = 40_075_016.686
const ZOOM_MINIMO = 10
/** Nível de rua. Mais perto que isso o círculo vira o mapa inteiro. */
const ZOOM_MAXIMO = 17
/** Quanto do lado menor do mapa o diâmetro do círculo pode ocupar. */
const FOLGA = 0.6

const radianos = (graus: number) => (graus * Math.PI) / 180

/** Posição do ponto na grade de ladrilhos do zoom, com a fração dentro do ladrilho. */
export function pontoEmLadrilhos({ latitude, longitude }: Coordenada, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom
  const lat = radianos(latitude)
  return {
    x: ((longitude + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n,
  }
}

export function metrosPorPixel(latitude: number, zoom: number): number {
  return (CIRCUNFERENCIA_EQUADOR_M * Math.cos(radianos(latitude))) / (TAMANHO_LADRILHO * 2 ** zoom)
}

export function zoomParaArea(raioM: number, latitude: number, largura: number, altura: number): number {
  const espacoPx = Math.min(largura, altura) * FOLGA
  for (let zoom = ZOOM_MAXIMO; zoom > ZOOM_MINIMO; zoom--) {
    if ((2 * raioM) / metrosPorPixel(latitude, zoom) <= espacoPx) return zoom
  }
  return ZOOM_MINIMO
}

export interface Ladrilho {
  url: string
  /** Posição na tela, em pixels, relativa ao canto do mapa. */
  esquerda: number
  topo: number
}

export interface MapaMontado {
  zoom: number
  ladrilhos: Ladrilho[]
  circulo: { x: number; y: number; raio: number }
}

export function montarMapa(opcoes: {
  centro: Coordenada
  raioM: number
  largura: number
  altura: number
  /** Endereço com {z}, {x} e {y}, no formato dos servidores de ladrilho. */
  modeloUrl: string
}): MapaMontado {
  const { centro, raioM, largura, altura, modeloUrl } = opcoes
  const zoom = zoomParaArea(raioM, centro.latitude, largura, altura)
  const { x, y } = pontoEmLadrilhos(centro, zoom)

  // canto superior esquerdo do mapa, em pixels do mundo naquele zoom
  const origemX = x * TAMANHO_LADRILHO - largura / 2
  const origemY = y * TAMANHO_LADRILHO - altura / 2

  const ladrilhos: Ladrilho[] = []
  for (let ty = Math.floor(origemY / TAMANHO_LADRILHO); ty * TAMANHO_LADRILHO < origemY + altura; ty++) {
    for (let tx = Math.floor(origemX / TAMANHO_LADRILHO); tx * TAMANHO_LADRILHO < origemX + largura; tx++) {
      ladrilhos.push({
        url: modeloUrl.replace('{z}', String(zoom)).replace('{x}', String(tx)).replace('{y}', String(ty)),
        esquerda: tx * TAMANHO_LADRILHO - origemX,
        topo: ty * TAMANHO_LADRILHO - origemY,
      })
    }
  }

  return {
    zoom,
    ladrilhos,
    circulo: { x: largura / 2, y: altura / 2, raio: raioM / metrosPorPixel(centro.latitude, zoom) },
  }
}

/** Endereço público do projeto, que a política do OpenStreetMap pede como contato. */
const CONTATO = 'https://github.com/RNobre1/achei-um-bicho'

/**
 * Cabeçalhos de cada pedido de ladrilho. O OpenStreetMap bloqueia quem pede com a
 * identificação genérica da biblioteca de rede (no Android, "okhttp/..."): devolve
 * uma imagem de "403 Access blocked" no lugar do mapa. A política de uso exige que
 * o aplicativo se identifique, com nome e contato. Na web o navegador não deixa
 * trocar o User-Agent, e lá não precisa: ele já manda o endereço do site.
 */
export function cabecalhosDosLadrilhos(versao: string): { 'User-Agent': string } {
  return { 'User-Agent': `AcheiUmBicho/${versao} (+${CONTATO})` }
}

/**
 * Fonte da imagem de um ladrilho, sempre em lista. No React Native 0.86, o Image do
 * Android descarta os cabeçalhos de um source que seja objeto único: só os repassa
 * ao nativo quando o source é uma lista (ver Libraries/Image/Image.android.js).
 */
export function fonteDoLadrilho(url: string, cabecalhos: Record<string, string>): { uri: string; headers: Record<string, string> }[] {
  return [{ uri: url, headers: cabecalhos }]
}

