import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

/** Nome de arquivo aceito: o id da foto e a extensão. Nada de caminho vindo de fora. */
export const NOME_DE_FOTO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/

/**
 * Fotos guardadas no próprio banco. O servidor gratuito apaga o disco a cada
 * reinício, e a foto já chega reduzida. Trocar por armazenamento de objetos, se
 * um dia o volume pedir, é trocar esta classe, e só ela.
 */
@Injectable()
export class ArmazenamentoDeFotos {
  constructor(private readonly prisma: PrismaService) {}

  private conferir(nome: string): void {
    if (!NOME_DE_FOTO.test(nome)) throw new Error(`nome de foto inválido: ${nome}`)
  }

  async guardar(nome: string, conteudo: Buffer): Promise<void> {
    this.conferir(nome)
    await this.prisma.arquivoFoto.create({ data: { nome, conteudo: new Uint8Array(conteudo) } })
  }

  async ler(nome: string): Promise<Buffer | null> {
    this.conferir(nome)
    const arquivo = await this.prisma.arquivoFoto.findUnique({ where: { nome }, select: { conteudo: true } })
    return arquivo ? Buffer.from(arquivo.conteudo) : null
  }

  async apagar(nome: string): Promise<void> {
    this.conferir(nome)
    await this.prisma.arquivoFoto.deleteMany({ where: { nome } })
  }
}
