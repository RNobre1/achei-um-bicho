import type { Ponto } from './ponto'

const RAIO_DA_TERRA_M = 6_371_000

/** Distância em metros sobre a esfera (haversine); sobra para as distâncias do mural. */
export function distanciaEmMetros(a: Ponto, b: Ponto): number {
  const rad = Math.PI / 180
  const dLat = (b.latitude - a.latitude) * rad
  const dLon = (b.longitude - a.longitude) * rad
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2
  return 2 * RAIO_DA_TERRA_M * Math.asin(Math.sqrt(h))
}
