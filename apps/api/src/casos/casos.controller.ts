import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common'
import { CABECALHO_CODIGO_EDICAO, type SituacaoDoCaso } from '@achei/contratos'
import { CasosService } from './casos.service'
import type { CasoAberto } from './dto/caso-aberto.dto'
import type { Mural } from './dto/consultar-mural.dto'
import { ConsultarMuralDto } from './dto/consultar-mural.dto'
import type { CasoPublicado } from './dto/publicar-caso.dto'
import { PublicarCasoDto } from './dto/publicar-caso.dto'

@Controller('casos')
export class CasosController {
  constructor(private readonly casos: CasosService) {}

  @Post()
  publicar(@Body() dados: PublicarCasoDto): Promise<CasoPublicado> {
    return this.casos.publicar(dados)
  }

  @Get()
  mural(@Query() consulta: ConsultarMuralDto): Promise<Mural> {
    return this.casos.mural(consulta)
  }

  @Get(':id')
  abrir(@Param('id', new ParseUUIDPipe()) id: string): Promise<CasoAberto> {
    return this.casos.abrir(id)
  }

  @Get(':id/situacao')
  situacao(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers(CABECALHO_CODIGO_EDICAO) codigoEdicao?: string,
  ): Promise<SituacaoDoCaso> {
    return this.casos.situacao(id, codigoEdicao)
  }

  @Post(':id/confirmacao')
  @HttpCode(HttpStatus.OK)
  confirmar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers(CABECALHO_CODIGO_EDICAO) codigoEdicao?: string,
  ): Promise<{ ok: true }> {
    return this.casos.confirmar(id, codigoEdicao)
  }

  @Post(':id/reabertura')
  @HttpCode(HttpStatus.OK)
  reabrir(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers(CABECALHO_CODIGO_EDICAO) codigoEdicao?: string,
  ): Promise<{ ok: true }> {
    return this.casos.reabrir(id, codigoEdicao)
  }
}
