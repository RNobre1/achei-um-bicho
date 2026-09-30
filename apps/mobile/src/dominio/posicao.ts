export interface Coordenada {
  latitude: number
  longitude: number
}

export interface Posicao {
  ponto: Coordenada
  /** true quando não deu para usar o GPS e o ponto é o centro da cidade. */
  aproximada: boolean
}

/** O que o mural precisa do GPS do aparelho; a tela liga isto ao expo-location. */
export interface Gps {
  pedirPermissao(): Promise<boolean>
  posicaoAtual(): Promise<Coordenada>
}

/** Praça central de Santarém: onde o mural começa quando o GPS não está disponível. */
export const CENTRO_SANTAREM: Coordenada = { latitude: -2.4385, longitude: -54.7085 }

/**
 * Tempo máximo esperando permissão e sinal. Depois disso o mural abre no centro da
 * cidade: mostrar casos da cidade já é mais útil que uma tela girando.
 */
export const PRAZO_GPS_MS = 8000

const RESERVA: Posicao = { ponto: CENTRO_SANTAREM, aproximada: true }

async function doGps(gps: Gps): Promise<Posicao> {
  if (!(await gps.pedirPermissao())) return RESERVA
  return { ponto: await gps.posicaoAtual(), aproximada: false }
}

export function localizar(gps: Gps, prazoMs = PRAZO_GPS_MS): Promise<Posicao> {
  let relogio: ReturnType<typeof setTimeout> | undefined
  const prazo = new Promise<Posicao>((resolver) => {
    relogio = setTimeout(() => resolver(RESERVA), prazoMs)
  })
  const tentativa = doGps(gps).catch(() => RESERVA)
  return Promise.race([tentativa, prazo]).finally(() => clearTimeout(relogio))
}
