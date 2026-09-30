import { CABECALHO_CODIGO_EDICAO } from '@achei/contratos'
import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post } from '@nestjs/common'
import { AvistamentosService } from './avistamentos.service'
import type { AvistamentoParaAutor, AvistamentoRegistrado } from './dto/registrar-avistamento.dto'
import { RegistrarAvistamentoDto } from './dto/registrar-avistamento.dto'

@Controller('casos/:id/avistamentos')
export class AvistamentosController {
  constructor(private readonly avistamentos: AvistamentosService) {}

  @Post()
  registrar(
    @Param('id', new ParseUUIDPipe()) casoId: string,
    @Body() dados: RegistrarAvistamentoDto,
  ): Promise<AvistamentoRegistrado> {
    return this.avistamentos.registrar(casoId, dados)
  }

  @Get()
  listar(
    @Param('id', new ParseUUIDPipe()) casoId: string,
    @Headers(CABECALHO_CODIGO_EDICAO) codigo?: string,
  ): Promise<AvistamentoParaAutor[]> {
    return this.avistamentos.listarParaAutor(casoId, codigo)
  }
}
