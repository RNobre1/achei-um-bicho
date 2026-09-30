import { ESTADOS_ABERTOS } from '@achei/contratos'
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { conferirCodigoEdicao } from '../casos/codigo-edicao'
import { AvistamentosRepositorio, type SituacaoDoCaso } from './avistamentos.repositorio'
import type {
  AvistamentoParaAutor,
  AvistamentoRegistrado,
  RegistrarAvistamentoDto,
} from './dto/registrar-avistamento.dto'

@Injectable()
export class AvistamentosService {
  constructor(private readonly repositorio: AvistamentosRepositorio) {}

  private async situacao(casoId: string): Promise<SituacaoDoCaso> {
    const situacao = await this.repositorio.situacao(casoId)
    if (!situacao) throw new NotFoundException('caso não encontrado')
    return situacao
  }

  async registrar(casoId: string, dados: RegistrarAvistamentoDto): Promise<AvistamentoRegistrado> {
    const { estado } = await this.situacao(casoId)
    if (!ESTADOS_ABERTOS.includes(estado)) {
      throw new ConflictException('este caso já saiu do mural e não recebe mais avisos')
    }
    const id = await this.repositorio.registrar(casoId, dados)
    return { id, vistoEm: dados.vistoEm }
  }

  async listarParaAutor(casoId: string, codigo: string | undefined): Promise<AvistamentoParaAutor[]> {
    const { codigoEdicaoHash } = await this.situacao(casoId)
    if (!conferirCodigoEdicao(codigo, codigoEdicaoHash)) {
      throw new ForbiddenException('código de edição não confere com este caso')
    }
    return this.repositorio.listarParaAutor(casoId)
  }
}
