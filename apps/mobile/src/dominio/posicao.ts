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
 * Tempo máximo esperando o sinal do GPS, contado depois que a pessoa respondeu à
 * permissão. Depois disso o mural abre no centro da cidade: mostrar casos da cidade
 * já é mais útil que uma tela girando.
 */
export const PRAZO_GPS_MS = 8000

/**
 * Tempo máximo esperando a resposta ao pedido de permissão. No celular a janela
 * espera a pessoa; no navegador o pedido ignorado nunca responde, e o mural não pode
 * girar para sempre por isso.
 */
export const PRAZO_PERMISSAO_MS = 30000

const RESERVA: Posicao = { ponto: CENTRO_SANTAREM, aproximada: true }

/** A promessa, ou a reserva se ela falhar ou não responder dentro do prazo. */
function comPrazo<T>(promessa: Promise<T>, prazoMs: number, reserva: T): Promise<T> {
  let relogio: ReturnType<typeof setTimeout> | undefined
  const prazo = new Promise<T>((resolver) => {
    relogio = setTimeout(() => resolver(reserva), prazoMs)
  })
  return Promise.race([promessa.catch(() => reserva), prazo]).finally(() => clearTimeout(relogio))
}

export async function localizar(gps: Gps, prazoMs = PRAZO_GPS_MS): Promise<Posicao> {
  // o tempo lendo a janela de permissão não pode gastar o prazo do GPS
  const permitiu = await comPrazo(gps.pedirPermissao(), PRAZO_PERMISSAO_MS, false)
  if (!permitiu) return RESERVA
  const ponto = gps.posicaoAtual().then((coordenada): Posicao => ({ ponto: coordenada, aproximada: false }))
  return comPrazo(ponto, prazoMs, RESERVA)
}
