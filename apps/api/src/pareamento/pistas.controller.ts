import { CABECALHO_CODIGO_EDICAO, type Pista, type VereditoPareamento } from '@achei/contratos'
import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common'
import { VereditoDaPistaDto } from './dto/veredito-da-pista.dto'
import { PistasService } from './pistas.service'

@Controller('casos/:id/pistas')
export class PistasController {
  constructor(private readonly pistas: PistasService) {}

  @Get()
  listar(
    @Param('id', new ParseUUIDPipe()) casoId: string,
    @Headers(CABECALHO_CODIGO_EDICAO) codigo: string | undefined,
  ): Promise<Pista[]> {
    return this.pistas.listar(casoId, codigo)
  }

  @Post(':pistaId/veredito')
  @HttpCode(200)
  decidir(
    @Param('id', new ParseUUIDPipe()) casoId: string,
    @Param('pistaId', new ParseUUIDPipe()) pistaId: string,
    @Headers(CABECALHO_CODIGO_EDICAO) codigo: string | undefined,
    @Body() corpo: VereditoDaPistaDto,
  ): Promise<{ id: string; veredito: VereditoPareamento }> {
    return this.pistas.decidir(casoId, pistaId, codigo, corpo.veredito)
  }
}
