import { describe, expect, it } from 'vitest'
import { metrosPorPixel, montarMapa, pontoEmLadrilhos, TAMANHO_LADRILHO, zoomParaArea } from './mapa'

const PRACA = { latitude: -2.4385, longitude: -54.7085 }
const MODELO = 'https://ladrilhos.exemplo/{z}/{x}/{y}.png'

describe('mapa da área aproximada', () => {
  it('converte o ponto em coordenadas de ladrilho (Web Mercator)', () => {
    const { x, y } = pontoEmLadrilhos(PRACA, 14)
    expect(x).toBeCloseTo(5702.155, 3)
    expect(y).toBeCloseTo(8303.012, 3)
  })

  it('sabe quantos metros cabem num pixel na latitude de Santarém', () => {
    expect(metrosPorPixel(PRACA.latitude, 14)).toBeCloseTo(9.546, 3)
  })

  it('escolhe o maior zoom em que o círculo inteiro cabe com folga no mapa', () => {
    expect(zoomParaArea(300, PRACA.latitude, 342, 118)).toBe(14)
    expect(zoomParaArea(1600, PRACA.latitude, 342, 118)).toBe(11)
  })

  it('não aproxima além do nível de rua, nem para área minúscula', () => {
    expect(zoomParaArea(5, PRACA.latitude, 342, 118)).toBe(17)
  })

  describe('montarMapa', () => {
    const mapa = montarMapa({ centro: PRACA, raioM: 300, largura: 342, altura: 118, modeloUrl: MODELO })

    it('põe o centro da área no meio do mapa, com o raio na escala do zoom', () => {
      expect(mapa.zoom).toBe(14)
      expect(mapa.circulo.x).toBe(171)
      expect(mapa.circulo.y).toBe(59)
      expect(mapa.circulo.raio).toBeCloseTo(300 / metrosPorPixel(PRACA.latitude, 14), 5)
    })

    it('cobre o mapa inteiro com ladrilhos, sem buraco nas bordas', () => {
      for (const [px, py] of [[0, 0], [341, 0], [0, 117], [341, 117], [171, 59]] as const) {
        const cobre = mapa.ladrilhos.some(
          (l) => px >= l.esquerda && px < l.esquerda + TAMANHO_LADRILHO && py >= l.topo && py < l.topo + TAMANHO_LADRILHO,
        )
        expect(cobre, `pixel ${px},${py} sem ladrilho`).toBe(true)
      }
    })

    it('posiciona o ladrilho do centro de forma que o ponto caia no meio do mapa', () => {
      const { x, y } = pontoEmLadrilhos(PRACA, 14)
      const doCentro = mapa.ladrilhos.find((l) => l.url === `https://ladrilhos.exemplo/14/${Math.floor(x)}/${Math.floor(y)}.png`)
      expect(doCentro).toBeDefined()
      expect(doCentro!.esquerda + (x - Math.floor(x)) * TAMANHO_LADRILHO).toBeCloseTo(171, 5)
      expect(doCentro!.topo + (y - Math.floor(y)) * TAMANHO_LADRILHO).toBeCloseTo(59, 5)
    })

    it('não repete ladrilho', () => {
      const urls = mapa.ladrilhos.map((l) => l.url)
      expect(new Set(urls).size).toBe(urls.length)
    })
  })
})
