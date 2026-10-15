import { describe, expect, it } from 'vitest'
import { cabecalhosDosLadrilhos, fonteDoLadrilho, metrosPorPixel, montarMapa, pontoEmLadrilhos, TAMANHO_LADRILHO, zoomParaArea, enderecoNoGoogleMaps } from './mapa'

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

describe('identificação nos pedidos de ladrilho', () => {
  // Regressão: no APK o mapa vinha como a imagem "403 Access blocked", porque o
  // Android pedia os ladrilhos com a identificação genérica da biblioteca de rede
  // (okhttp), que a política de uso do OpenStreetMap bloqueia.
  const { 'User-Agent': agente } = cabecalhosDosLadrilhos('0.1.0')

  it('identifica o aplicativo pelo nome e pela versão', () => {
    expect(agente).toMatch(/^AcheiUmBicho\/0\.1\.0 /)
  })

  it('traz um endereço de contato, como pede a política do OpenStreetMap', () => {
    expect(agente).toContain('https://github.com/RNobre1/achei-um-bicho')
  })

  it('não se passa por navegador nem pela biblioteca de rede', () => {
    expect(agente).not.toMatch(/okhttp|Mozilla|Dalvik/i)
  })
})

describe('fonte da imagem de cada ladrilho', () => {
  const url = 'https://ladrilhos.exemplo/14/1/2.png'
  const cabecalhos = cabecalhosDosLadrilhos('0.1.2')

  // Regressão: no React Native 0.86, o Image do Android só repassa os cabeçalhos
  // ao nativo quando o source é uma lista; com um objeto único eles são descartados
  // e o pedido sai com a identificação genérica, que o OpenStreetMap bloqueia.
  it('no celular é uma lista, para o Android não descartar os cabeçalhos', () => {
    expect(fonteDoLadrilho(url, cabecalhos, 'android')).toEqual([{ uri: url, headers: cabecalhos }])
  })

  // Regressão: o react-native-web só lê source.uri de um objeto; com lista, o mapa
  // da versão web ficava em branco.
  it('na web é um objeto com o endereço', () => {
    expect(fonteDoLadrilho(url, cabecalhos, 'web')).toEqual({ uri: url })
  })
})

describe('abrir a área no Google Maps', () => {
  const area = { latitude: -2.4191, longitude: -54.7408 }

  // o centro publicado é deslocado do ponto real (D12): um pino mandaria gente à rua errada
  it('abre o mapa centrado na área, sem pino', () => {
    const endereco = enderecoNoGoogleMaps(area, 300)
    expect(endereco.startsWith('https://www.google.com/maps/@?api=1&map_action=map&center=-2.419100,-54.740800&zoom=')).toBe(true)
    expect(endereco).not.toMatch(/query=|search|place/)
  })

  it('usa o mesmo zoom de bairro que o mapa do aplicativo daria numa tela de celular', () => {
    expect(enderecoNoGoogleMaps(area, 300)).toMatch(/&zoom=15$/)
    expect(enderecoNoGoogleMaps(area, 1200)).toMatch(/&zoom=13$/)
  })
})
