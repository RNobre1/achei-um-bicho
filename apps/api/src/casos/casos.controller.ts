import { Body, Controller, Post } from '@nestjs/common'
import { CasosService } from './casos.service'
import type { CasoPublicado } from './dto/publicar-caso.dto'
import { PublicarCasoDto } from './dto/publicar-caso.dto'

@Controller('casos')
export class CasosController {
  constructor(private readonly casos: CasosService) {}

  @Post()
  publicar(@Body() dados: PublicarCasoDto): Promise<CasoPublicado> {
    return this.casos.publicar(dados)
  }
}
