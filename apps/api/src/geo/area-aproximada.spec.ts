import { createHash, randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CENTRO_SANTAREM } from '../../test/pontos'
import { areaAproximada } from './area-aproximada'

/** Distância em metros entre dois pontos próximos (haversine). */
function distanciaM(a: { latitude: number; longitude: number }, b: typeof a): number {
  const rad = Math.PI / 180
  const dLat = (b.latitude - a.latitude) * rad
  const dLon = (b.longitude - a.longitude) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}

describe('área aproximada publicada no lugar do ponto exato', () => {
  it('é sempre a mesma para o mesmo caso, para a média de várias consultas não revelar o ponto', () => {
    const id = randomUUID()
    expect(areaAproximada(id, CENTRO_SANTAREM, 300)).toEqual(areaAproximada(id, CENTRO_SANTAREM, 300))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('depende de um segredo do servidor: com o id e o raio públicos não dá para desfazer o deslocamento', () => {
    const id = randomUUID()
    vi.stubEnv('CODIGO_SEGREDO', 'segredo-a')
    const comSegredoA = areaAproximada(id, CENTRO_SANTAREM, 300)
    vi.stubEnv('CODIGO_SEGREDO', 'segredo-b')
    const comSegredoB = areaAproximada(id, CENTRO_SANTAREM, 300)
    expect(comSegredoA.centro).not.toEqual(comSegredoB.centro)

    // quem lê o código público refaz o sorteio só com o id e subtrai do centro publicado
    const hash = createHash('sha256').update(id).digest()
    const angulo = (hash.readUInt32BE(0) / 0x1_0000_0000) * 2 * Math.PI
    const distancia = 300 * (0.25 + (hash.readUInt32BE(4) / 0x1_0000_0000) * 0.5)
    const lat = comSegredoA.centro.latitude - (distancia * Math.cos(angulo)) / 110_574
    const lon =
      comSegredoA.centro.longitude -
      (distancia * Math.sin(angulo)) / (111_320 * Math.cos((CENTRO_SANTAREM.latitude * Math.PI) / 180))
    expect(distanciaM({ latitude: lat, longitude: lon }, CENTRO_SANTAREM)).toBeGreaterThan(10)
  })

  it('muda de um caso para outro', () => {
    const a = areaAproximada(randomUUID(), CENTRO_SANTAREM, 300)
    const b = areaAproximada(randomUUID(), CENTRO_SANTAREM, 300)
    expect(a.centro).not.toEqual(b.centro)
  })

  it('nunca publica o ponto exato nem um centro colado nele', () => {
    for (let i = 0; i < 200; i++) {
      const { centro } = areaAproximada(randomUUID(), CENTRO_SANTAREM, 300)
      expect(distanciaM(centro, CENTRO_SANTAREM)).toBeGreaterThanOrEqual(300 * 0.25 - 1)
    }
  })

  it('mantém o ponto verdadeiro dentro do círculo publicado', () => {
    for (let i = 0; i < 200; i++) {
      const { centro, raioM } = areaAproximada(randomUUID(), CENTRO_SANTAREM, 300)
      expect(distanciaM(centro, CENTRO_SANTAREM)).toBeLessThan(raioM)
    }
  })

  it('devolve o raio de imprecisão do local', () => {
    expect(areaAproximada(randomUUID(), CENTRO_SANTAREM, 450).raioM).toBe(450)
  })
})
