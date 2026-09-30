function segmento(marcador: number, conteudo: Buffer): Buffer {
  const cabecalho = Buffer.alloc(4)
  cabecalho.writeUInt8(0xff, 0)
  cabecalho.writeUInt8(marcador, 1)
  cabecalho.writeUInt16BE(conteudo.length + 2, 2)
  return Buffer.concat([cabecalho, conteudo])
}

/** JPEG mínimo, com as partes que importam: JFIF, EXIF com GPS, dimensões e dados. */
export function jpegDeTeste({ largura = 800, altura = 600, exif = true } = {}): Buffer {
  const sof = Buffer.alloc(15)
  sof.writeUInt8(8, 0) // precisão
  sof.writeUInt16BE(altura, 1)
  sof.writeUInt16BE(largura, 3)
  sof.writeUInt8(3, 5) // componentes
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    segmento(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')),
    ...(exif ? [segmento(0xe1, Buffer.from('Exif\0\0GPSLatitude -2.4385 GPSLongitude -54.7085', 'latin1'))] : []),
    segmento(0xfe, Buffer.from('comentario com nome do celular', 'latin1')),
    segmento(0xdb, Buffer.alloc(65, 1)),
    segmento(0xc0, sof),
    segmento(0xda, Buffer.from([3, 1, 0, 2, 0x11, 3, 0x11, 0, 0x3f, 0])),
    Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56]),
    Buffer.from([0xff, 0xd9]),
  ])
}
