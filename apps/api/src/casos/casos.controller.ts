import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { CasosService } from './casos.service'
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
}
