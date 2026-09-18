import type { Ponto } from '../src/geo/ponto'

/** Praça central de Santarém, referência para os casos de teste. */
export const CENTRO_SANTAREM: Ponto = { latitude: -2.4385, longitude: -54.7085 }

const METROS_POR_GRAU_DE_LATITUDE = 111_320

/** Desloca um ponto para o sul, em metros. Ao sul porque ao norte fica o rio. */
export function aoSul(ponto: Ponto, metros: number): Ponto {
  return {
    latitude: ponto.latitude - metros / METROS_POR_GRAU_DE_LATITUDE,
    longitude: ponto.longitude,
  }
}
