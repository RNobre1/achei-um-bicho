import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CENTRO_SANTAREM, localizar, PRAZO_GPS_MS, type Gps } from './posicao'

const NO_QUINTAL = { latitude: -2.44, longitude: -54.71 }

function gps(sobrescrever: Partial<Gps> = {}): Gps {
  return {
    pedirPermissao: async () => true,
    posicaoAtual: async () => NO_QUINTAL,
    ...sobrescrever,
  }
}

describe('localizar', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('usa o ponto do GPS quando a pessoa permite', async () => {
    await expect(localizar(gps())).resolves.toEqual({ ponto: NO_QUINTAL, aproximada: false })
  })

  it('cai no centro da cidade quando a pessoa nega a permissão', async () => {
    await expect(localizar(gps({ pedirPermissao: async () => false }))).resolves.toEqual({
      ponto: CENTRO_SANTAREM,
      aproximada: true,
    })
  })

  it('cai no centro da cidade quando o GPS falha', async () => {
    const falha = gps({ posicaoAtual: () => Promise.reject(new Error('sem sinal')) })
    await expect(localizar(falha)).resolves.toEqual({ ponto: CENTRO_SANTAREM, aproximada: true })
  })

  it('não deixa o mural esperando para sempre por uma permissão sem resposta', async () => {
    const semResposta = gps({ pedirPermissao: () => new Promise<boolean>(() => {}) })
    const resultado = localizar(semResposta)
    await vi.advanceTimersByTimeAsync(PRAZO_GPS_MS)
    await expect(resultado).resolves.toEqual({ ponto: CENTRO_SANTAREM, aproximada: true })
  })

  it('não deixa o mural esperando para sempre por um GPS que não fixa', async () => {
    const semSinal = gps({ posicaoAtual: () => new Promise(() => {}) })
    const resultado = localizar(semSinal)
    await vi.advanceTimersByTimeAsync(PRAZO_GPS_MS)
    await expect(resultado).resolves.toEqual({ ponto: CENTRO_SANTAREM, aproximada: true })
  })
})
