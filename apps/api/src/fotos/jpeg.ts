/**
 * Leitura mínima de JPEG, sem biblioteca de imagem: basta percorrer os segmentos
 * do cabeçalho. Serve para duas coisas:
 *
 * - tirar os metadados (EXIF, XMP, comentários), porque a câmera do celular grava
 *   ali a coordenada exata de onde a foto foi tirada, e a foto de um bicho achado
 *   costuma ser tirada na porta de casa;
 * - ler largura e altura, que o banco guarda.
 *
 * Os dados da imagem, depois do início do scan, são copiados sem mudança.
 */

export class ErroDeImagem extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroDeImagem'
  }
}

export interface JpegLido {
  largura: number
  altura: number
  semMetadados: Buffer
}

const SOI = 0xd8
const SOS = 0xda
const COM = 0xfe
// APP1 a APP15: EXIF, XMP, ICC e extensões de fabricante. APP0 (JFIF) fica.
const ehMetadado = (marcador: number) => (marcador >= 0xe1 && marcador <= 0xef) || marcador === COM
// quadros com as dimensões (SOF0 a SOF15, menos DHT, JPG e DAC, que usam o mesmo intervalo)
const ehQuadro = (marcador: number) =>
  marcador >= 0xc0 && marcador <= 0xcf && marcador !== 0xc4 && marcador !== 0xc8 && marcador !== 0xcc
const semTamanho = (marcador: number) => marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)

export function lerJpeg(arquivo: Buffer): JpegLido {
  if (arquivo.length < 4 || arquivo[0] !== 0xff || arquivo[1] !== SOI) {
    throw new ErroDeImagem('o arquivo não é uma imagem JPEG')
  }
  const partes: Buffer[] = [arquivo.subarray(0, 2)]
  let dimensoes: { largura: number; altura: number } | undefined
  let i = 2

  while (i < arquivo.length) {
    if (arquivo[i] !== 0xff) throw new ErroDeImagem('JPEG corrompido')
    const marcador = arquivo[i + 1]
    if (marcador === undefined) break
    if (marcador === 0xff) {
      i += 1 // byte de preenchimento
      continue
    }
    if (marcador === SOS) {
      if (!dimensoes) throw new ErroDeImagem('JPEG sem dimensões')
      partes.push(arquivo.subarray(i))
      return { ...dimensoes, semMetadados: Buffer.concat(partes) }
    }
    if (semTamanho(marcador)) {
      partes.push(arquivo.subarray(i, i + 2))
      i += 2
      continue
    }
    if (i + 4 > arquivo.length) break
    const fim = i + 2 + arquivo.readUInt16BE(i + 2)
    if (fim > arquivo.length) break
    if (ehQuadro(marcador)) {
      if (i + 9 > fim) throw new ErroDeImagem('JPEG corrompido')
      dimensoes = { altura: arquivo.readUInt16BE(i + 5), largura: arquivo.readUInt16BE(i + 7) }
    }
    if (!ehMetadado(marcador)) partes.push(arquivo.subarray(i, fim))
    i = fim
  }
  throw new ErroDeImagem(dimensoes ? 'JPEG cortado no meio' : 'JPEG sem dimensões')
}
