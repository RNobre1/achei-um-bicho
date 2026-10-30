import { ESTADOS_VIGIADOS, type EstadoCaso, type Pista, type VereditoPareamento } from '@achei/contratos'
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { conferirCodigoEdicao } from '../casos/codigo-edicao'
import { ordemDasPistas } from './comparar'
import { PareamentoRepositorio } from './pareamento.repositorio'

@Injectable()
export class PistasService {
  constructor(private readonly repositorio: PareamentoRepositorio) {}

  private async conferirAutoria(casoId: string, codigo: string | undefined): Promise<void> {
    const caso = await this.repositorio.codigoDoCaso(casoId)
    if (!caso) throw new NotFoundException('caso não encontrado')
    if (!conferirCodigoEdicao(codigo, caso.codigoEdicaoHash)) {
      throw new ForbiddenException('código de edição não confere com este caso')
    }
  }

  async listar(casoId: string, codigo: string | undefined): Promise<Pista[]> {
    await this.conferirAutoria(casoId, codigo)
    const pistas = await this.repositorio.pistasDoCaso(casoId)
    return pistas.sort(ordemDasPistas)
  }

  async decidir(
    casoId: string,
    pistaId: string,
    codigo: string | undefined,
    veredito: VereditoPareamento,
  ): Promise<{ id: string; veredito: VereditoPareamento }> {
    const caso = await this.repositorio.casoParaDecisao(casoId)
    if (!caso) throw new NotFoundException('caso não encontrado')
    if (!conferirCodigoEdicao(codigo, caso.codigoEdicaoHash)) {
      throw new ForbiddenException('código de edição não confere com este caso')
    }
    if (!ESTADOS_VIGIADOS.includes(caso.estado as EstadoCaso)) {
      throw new ConflictException(`caso em estado "${caso.estado}" não aceita decisões de pistas`)
    }
    if (!(await this.repositorio.decidir(pistaId, casoId, veredito))) {
      throw new NotFoundException('pista não encontrada neste caso')
    }
    return { id: pistaId, veredito }
  }
}
