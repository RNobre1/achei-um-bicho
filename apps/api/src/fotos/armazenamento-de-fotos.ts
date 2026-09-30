import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Inject, Injectable } from '@nestjs/common'
import type { Configuracao } from '../configuracao'
import { CONFIGURACAO } from '../configuracao.module'

/** Nome de arquivo aceito: o id da foto e a extensão. Nada de caminho vindo de fora. */
export const NOME_DE_FOTO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/

/**
 * Fotos guardadas em disco. Para o alpha basta; trocar por armazenamento de
 * objetos é trocar esta classe, e só ela.
 */
@Injectable()
export class ArmazenamentoDeFotos {
  constructor(@Inject(CONFIGURACAO) private readonly configuracao: Configuracao) {}

  caminhoNoDisco(nome: string): string {
    if (!NOME_DE_FOTO.test(nome)) throw new Error(`nome de foto inválido: ${nome}`)
    return join(this.configuracao.pastaFotos, nome)
  }

  async guardar(nome: string, conteudo: Buffer): Promise<void> {
    await mkdir(this.configuracao.pastaFotos, { recursive: true })
    await writeFile(this.caminhoNoDisco(nome), conteudo)
  }

  async apagar(nome: string): Promise<void> {
    await rm(this.caminhoNoDisco(nome), { force: true })
  }
}
