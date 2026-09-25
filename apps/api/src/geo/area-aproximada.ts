import { createHash } from 'node:crypto'
import type { Ponto } from './ponto'

const METROS_POR_GRAU_DE_LATITUDE = 110_574
const METROS_POR_GRAU_DE_LONGITUDE_NO_EQUADOR = 111_320

// o centro publicado fica entre 25% e 75% do raio de distância do ponto real:
// nunca em cima dele, e o ponto real sempre dentro do círculo
const DESLOCAMENTO_MINIMO = 0.25
const DESLOCAMENTO_MAXIMO = 0.75

export interface AreaAproximada {
  centro: Ponto
  raioM: number
}

/** Dois números entre 0 e 1 tirados do id do caso, sempre os mesmos para o mesmo caso. */
function sorteioFixo(id: string): [number, number] {
  const hash = createHash('sha256').update(id).digest()
  return [hash.readUInt32BE(0) / 0x1_0000_0000, hash.readUInt32BE(4) / 0x1_0000_0000]
}

/**
 * Área que substitui o ponto exato na resposta da API.
 *
 * O deslocamento é determinístico de propósito: se fosse sorteado a cada consulta,
 * bastaria pedir o mesmo caso várias vezes e tirar a média para achar a casa de
 * quem publicou.
 */
export function areaAproximada(idCaso: string, ponto: Ponto, raioM: number): AreaAproximada {
  const [sorteioAngulo, sorteioDistancia] = sorteioFixo(idCaso)
  const angulo = sorteioAngulo * 2 * Math.PI
  const distancia =
    raioM * (DESLOCAMENTO_MINIMO + sorteioDistancia * (DESLOCAMENTO_MAXIMO - DESLOCAMENTO_MINIMO))

  const metrosPorGrauDeLongitude =
    METROS_POR_GRAU_DE_LONGITUDE_NO_EQUADOR * Math.cos((ponto.latitude * Math.PI) / 180)

  return {
    centro: {
      latitude: ponto.latitude + (distancia * Math.cos(angulo)) / METROS_POR_GRAU_DE_LATITUDE,
      longitude: ponto.longitude + (distancia * Math.sin(angulo)) / metrosPorGrauDeLongitude,
    },
    raioM,
  }
}
