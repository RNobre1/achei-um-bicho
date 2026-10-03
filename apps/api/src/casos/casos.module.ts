import { Module } from '@nestjs/common'
import { GeoModule } from '../geo/geo.module'
import { PareamentoModule } from '../pareamento/pareamento.module'
import { CasosController } from './casos.controller'
import { CasosRepositorio } from './casos.repositorio'
import { CasosService } from './casos.service'

@Module({
  imports: [GeoModule, PareamentoModule],
  controllers: [CasosController],
  providers: [CasosService, CasosRepositorio],
})
export class CasosModule {}
