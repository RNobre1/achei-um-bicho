import type { PerguntaPublica, ReivindicacaoRegistrada } from '@achei/contratos'
import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common'
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
}
