import {
  CABECALHO_CODIGO_EDICAO,
  type PerguntaPublica,
  type ReivindicacaoParaAutor,
  type ReivindicacaoRegistrada,
} from '@achei/contratos'
import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post } from '@nestjs/common'
import { NovaReivindicacaoDto } from './dto/nova-reivindicacao.dto'
import { ReivindicacoesService } from './reivindicacoes.service'

@Controller('casos/:id')
export class ReivindicacoesController {
  constructor(private readonly service: ReivindicacoesService) {}

  @Get('perguntas')
  perguntas(@Param('id', new ParseUUIDPipe()) id: string): Promise<PerguntaPublica[]> {
    return this.service.listarPerguntas(id)
  }

  @Post('reivindicacoes')
  reivindicar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() corpo: NovaReivindicacaoDto,
  ): Promise<ReivindicacaoRegistrada> {
    return this.service.reivindicar(id, corpo)
  }

  @Get('reivindicacoes')
  listarParaAutor(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers(CABECALHO_CODIGO_EDICAO) codigo: string | undefined,
  ): Promise<ReivindicacaoParaAutor[]> {
    return this.service.listarParaAutor(id, codigo)
  }
}
