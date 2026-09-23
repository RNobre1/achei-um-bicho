import { Module } from '@nestjs/common'
import { GeoModule } from '../geo/geo.module'
import { CasosController } from './casos.controller'
import { CasosRepositorio } from './casos.repositorio'
import { CasosService } from './casos.service'

@Module({
  imports: [GeoModule],
  controllers: [CasosController],
  providers: [CasosService, CasosRepositorio],
})
export class CasosModule {}
