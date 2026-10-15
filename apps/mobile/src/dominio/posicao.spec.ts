import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CENTRO_SANTAREM, localizar, PRAZO_GPS_MS, PRAZO_PERMISSAO_MS, type Gps } from './posicao'

const NO_QUINTAL = { latitude: -2.44, longitude: -54.71 }

function gps(sobrescrever: Partial<Gps> = {}): Gps {
  return {
    pedirPermissao: async () => true,
    posicaoAtual: async () => NO_QUINTAL,
    ultimaPosicao: async () => undefined,
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
    await vi.advanceTimersByTimeAsync(PRAZO_PERMISSAO_MS)
    await expect(resultado).resolves.toEqual({ ponto: CENTRO_SANTAREM, aproximada: true })
  })

  // quem lê a janela de permissão com calma não pode perder o GPS por isso
  it('o tempo lendo o pedido de permissão não conta no prazo do GPS', async () => {
    const depois = (ms: number) => new Promise<void>((pronto) => setTimeout(pronto, ms))
    const devagar = gps({
      pedirPermissao: () => depois(PRAZO_GPS_MS - 1000).then(() => true),
      posicaoAtual: () => depois(2000).then(() => NO_QUINTAL),
    })
    const resultado = localizar(devagar)
    await vi.advanceTimersByTimeAsync(PRAZO_GPS_MS + 1000)
    await expect(resultado).resolves.toEqual({ ponto: NO_QUINTAL, aproximada: false })
  })

  it('o prazo do GPS começa quando a pessoa responde à permissão', async () => {
    const depois = (ms: number) => new Promise<void>((pronto) => setTimeout(pronto, ms))
    const semSinal = gps({ pedirPermissao: () => depois(5000).then(() => true), posicaoAtual: () => new Promise(() => {}) })
    const resultado = localizar(semSinal)
    let resolvido = false
    void resultado.then(() => (resolvido = true))
    await vi.advanceTimersByTimeAsync(5000 + PRAZO_GPS_MS - 1)
    expect(resolvido).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await expect(resultado).resolves.toEqual({ ponto: CENTRO_SANTAREM, aproximada: true })
  })

  it('não deixa o mural esperando para sempre por um GPS que não fixa', async () => {
    const semSinal = gps({ posicaoAtual: () => new Promise(() => {}) })
    const resultado = localizar(semSinal)
    await vi.advanceTimersByTimeAsync(PRAZO_GPS_MS)
    await expect(resultado).resolves.toEqual({ ponto: CENTRO_SANTAREM, aproximada: true })
  })

  // o celular quase sempre já sabe onde está: esperar uma posição nova à toa fazia o
  // mural cair no centro da cidade numa abertura sim, noutra não
  it('usa a posição recente que o aparelho já tem, sem esperar o GPS', async () => {
    const naEsquina = { latitude: -2.441, longitude: -54.711 }
    const comPosicaoRecente = gps({ ultimaPosicao: async () => naEsquina, posicaoAtual: () => new Promise(() => {}) })
    await expect(localizar(comPosicaoRecente)).resolves.toEqual({ ponto: naEsquina, aproximada: false })
  })

  it('se o GPS passa do prazo, usa a posição que o aparelho conseguiu enquanto isso', async () => {
    const naEsquina = { latitude: -2.441, longitude: -54.711 }
    const respostas = [undefined, naEsquina]
    const demorado = gps({ ultimaPosicao: async () => respostas.shift(), posicaoAtual: () => new Promise(() => {}) })
    const resultado = localizar(demorado)
    await vi.advanceTimersByTimeAsync(PRAZO_GPS_MS)
    await expect(resultado).resolves.toEqual({ ponto: naEsquina, aproximada: false })
  })

  it('sem permissão, nem a posição guardada no aparelho é lida', async () => {
    const ultimaPosicao = vi.fn(async () => NO_QUINTAL)
    await localizar(gps({ pedirPermissao: async () => false, ultimaPosicao }))
    expect(ultimaPosicao).not.toHaveBeenCalled()
  })
})
