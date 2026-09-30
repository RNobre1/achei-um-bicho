import { Module } from '@nestjs/common'
import { GeoModule } from '../geo/geo.module'
import { AvistamentosController } from './avistamentos.controller'
import { AvistamentosRepositorio } from './avistamentos.repositorio'
import { AvistamentosService } from './avistamentos.service'

@Module({
  imports: [GeoModule],
  controllers: [AvistamentosController],
  providers: [AvistamentosService, AvistamentosRepositorio],
})
export class AvistamentosModule {}
