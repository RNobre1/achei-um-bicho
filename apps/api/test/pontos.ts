import type { Ponto } from '../src/geo/ponto'

/** Praça central de Santarém, referência para os casos de teste. */
export const CENTRO_SANTAREM: Ponto = { latitude: -2.4385, longitude: -54.7085 }

// um grau de latitude perto do equador mede cerca de 110,57 km (111,32 km é o grau
// de longitude, que só vale no próprio equador)
const METROS_POR_GRAU_DE_LATITUDE = 110_574

/** Desloca um ponto para o sul, em metros. Ao sul porque ao norte fica o rio. */
export function aoSul(ponto: Ponto, metros: number): Ponto {
  return {
    latitude: ponto.latitude - metros / METROS_POR_GRAU_DE_LATITUDE,
    longitude: ponto.longitude,
  }
}
