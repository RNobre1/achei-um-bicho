import {
  CABECALHO_CODIGO_EDICAO,
  type PerguntaPublica,
  type ReivindicacaoParaAutor,
  type ReivindicacaoRegistrada,
  type VereditoVerificacao,
} from '@achei/contratos'
import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common'
import { NovaReivindicacaoDto } from './dto/nova-reivindicacao.dto'
import { NovoVereditoDaReivindicacaoDto } from './dto/novo-veredito-da-reivindicacao.dto'
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

  @Post('reivindicacoes/:rid/veredito')
  @HttpCode(200)
  decidir(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('rid', new ParseUUIDPipe()) rid: string,
    @Headers(CABECALHO_CODIGO_EDICAO) codigo: string | undefined,
    @Body() corpo: NovoVereditoDaReivindicacaoDto,
  ): Promise<{ id: string; veredito: VereditoVerificacao }> {
    return this.service.decidir(id, rid, codigo, corpo)
  }
}
