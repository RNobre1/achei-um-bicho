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
  /** Posição que o aparelho já tem, se for recente e precisa (ver POSICAO_GUARDADA). */
  ultimaPosicao(): Promise<Coordenada | undefined>
}

/**
 * Até onde vale a posição que o aparelho já guardou. Dois minutos a pé são uns 150 m,
 * menos que o raio de 300 m publicado; 200 m de precisão é o que a rede Wi-Fi dá.
 */
export const POSICAO_GUARDADA = { idadeMaximaMs: 2 * 60 * 1000, precisaoMinimaM: 200 } as const

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
  const doGps = (coordenada: Coordenada): Posicao => ({ ponto: coordenada, aproximada: false })
  const guardada = async () => {
    const coordenada = await gps.ultimaPosicao().catch(() => undefined)
    return coordenada ? doGps(coordenada) : undefined
  }

  // o celular quase sempre já sabe onde está; pedir uma posição nova é o plano B
  const jaTinha = await guardada()
  if (jaTinha) return jaTinha
  const nova = await comPrazo(gps.posicaoAtual().then(doGps), prazoMs, undefined)
  // enquanto o prazo corria, o aparelho pode ter conseguido uma posição
  return nova ?? (await guardada()) ?? RESERVA
}
