import type { PerguntaPublica } from '@achei/contratos'
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common'
import { ReivindicacoesService } from './reivindicacoes.service'

@Controller('casos/:id')
export class ReivindicacoesController {
  constructor(private readonly service: ReivindicacoesService) {}

  @Get('perguntas')
  perguntas(@Param('id', new ParseUUIDPipe()) id: string): Promise<PerguntaPublica[]> {
    return this.service.listarPerguntas(id)
  }
}
