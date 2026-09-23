import { Injectable } from '@nestjs/common'
import { ESTADO_INICIAL } from '@achei/contratos'
import { CasosRepositorio } from './casos.repositorio'
import { gerarCodigoEdicao, hashCodigoEdicao } from './codigo-edicao'
import type { CasoPublicado, PublicarCasoDto } from './dto/publicar-caso.dto'

@Injectable()
export class CasosService {
  constructor(private readonly repositorio: CasosRepositorio) {}

  async publicar(dados: PublicarCasoDto): Promise<CasoPublicado> {
    const estado = ESTADO_INICIAL[dados.tipo]
    const codigoEdicao = gerarCodigoEdicao()
    const id = await this.repositorio.criar({
      dados,
      estado,
      codigoEdicaoHash: hashCodigoEdicao(codigoEdicao),
    })
    return { id, tipo: dados.tipo, estado, codigoEdicao }
  }
}
