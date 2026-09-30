import { randomUUID } from 'node:crypto'
import { FOTO, type FotoEnviada } from '@achei/contratos'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { conferirCodigoEdicao } from '../casos/codigo-edicao'
import { ArmazenamentoDeFotos } from './armazenamento-de-fotos'
import { FotosRepositorio } from './fotos.repositorio'
import { ErroDeImagem, lerJpeg, type JpegLido } from './jpeg'

@Injectable()
export class FotosService {
  constructor(
    private readonly repositorio: FotosRepositorio,
    private readonly armazenamento: ArmazenamentoDeFotos,
  ) {}

  async enviar(casoId: string, codigo: string | undefined, arquivo: Buffer | undefined): Promise<FotoEnviada> {
    const situacao = await this.repositorio.situacao(casoId)
    if (!situacao) throw new NotFoundException('caso não encontrado')
    if (!conferirCodigoEdicao(codigo, situacao.codigoEdicaoHash)) {
      throw new ForbiddenException('código de edição não confere com este caso')
    }
    if (!arquivo || arquivo.length === 0) throw new BadRequestException('envie a foto no campo "foto"')
    if (situacao.totalDeFotos >= FOTO.maximoPorCaso) {
      throw new ConflictException(`cada caso aceita no máximo ${FOTO.maximoPorCaso} fotos`)
    }

    let jpeg: JpegLido
    try {
      jpeg = lerJpeg(arquivo)
    } catch (erro) {
      if (erro instanceof ErroDeImagem) throw new BadRequestException(erro.message)
      throw erro
    }

    const id = randomUUID()
    const nome = `${id}.jpg`
    const caminho = `/fotos/${nome}`
    await this.armazenamento.guardar(nome, jpeg.semMetadados)
    try {
      await this.repositorio.registrar({ id, animalId: situacao.animalId, caminho, largura: jpeg.largura, altura: jpeg.altura })
    } catch (erro) {
      // sem registro no banco, o arquivo seria lixo que ninguém encontra
      await this.armazenamento.apagar(nome)
      throw erro
    }
    return { id, caminho }
  }
}
