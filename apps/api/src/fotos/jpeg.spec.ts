import { describe, expect, it } from 'vitest'
import { jpegDeTeste } from '../../test/jpeg-de-teste'
import { ErroDeImagem, lerJpeg } from './jpeg'

describe('leitura de JPEG enviado pelo aplicativo', () => {
  it('lê largura e altura do cabeçalho da imagem', () => {
    const { largura, altura } = lerJpeg(jpegDeTeste({ largura: 1080, altura: 810 }))
    expect({ largura, altura }).toEqual({ largura: 1080, altura: 810 })
  })

  it('tira o EXIF, onde o celular grava a coordenada de onde a foto foi tirada', () => {
    const { semMetadados } = lerJpeg(jpegDeTeste())
    expect(semMetadados.toString('latin1')).not.toContain('Exif')
    expect(semMetadados.toString('latin1')).not.toContain('GPS')
    expect(semMetadados.toString('latin1')).not.toContain('nome do celular')
  })

  it('preserva o resto da imagem byte a byte', () => {
    const original = jpegDeTeste({ exif: false })
    const semComentario = lerJpeg(original).semMetadados
    // só o comentário (COM) sai; JFIF, tabelas, quadro e dados ficam
    expect(semComentario.toString('latin1')).toContain('JFIF')
    expect(semComentario.subarray(-7)).toEqual(original.subarray(-7))
  })

  it('recusa arquivo que não é JPEG', () => {
    expect(() => lerJpeg(Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'))).toThrow(ErroDeImagem)
    expect(() => lerJpeg(Buffer.alloc(0))).toThrow(ErroDeImagem)
  })

  it('recusa JPEG cortado no meio', () => {
    const inteiro = jpegDeTeste()
    expect(() => lerJpeg(inteiro.subarray(0, 40))).toThrow(ErroDeImagem)
  })

  it('recusa JPEG sem dimensões', () => {
    const semQuadro = Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from([0xff, 0xd9])])
    expect(() => lerJpeg(semQuadro)).toThrow(ErroDeImagem)
  })
})
