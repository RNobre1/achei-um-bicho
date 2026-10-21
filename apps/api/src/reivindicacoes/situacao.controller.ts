import { CABECALHO_CODIGO_ACOMPANHAMENTO, type SituacaoDaReivindicacao } from '@achei/contratos'
import { Controller, Get, Headers, Param, ParseUUIDPipe } from '@nestjs/common'
import { ReivindicacoesService } from './reivindicacoes.service'

@Controller('reivindicacoes')
export class SituacaoController {
  constructor(private readonly service: ReivindicacoesService) {}

  @Get(':id')
  consultar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers(CABECALHO_CODIGO_ACOMPANHAMENTO) codigo: string | undefined,
  ): Promise<SituacaoDaReivindicacao> {
    return this.service.consultarSituacao(id, codigo)
  }
}
