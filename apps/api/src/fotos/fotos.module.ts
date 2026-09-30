import { Module } from '@nestjs/common'
import { ArmazenamentoDeFotos } from './armazenamento-de-fotos'
import { FotosController } from './fotos.controller'
import { FotosRepositorio } from './fotos.repositorio'
import { FotosService } from './fotos.service'

@Module({
  controllers: [FotosController],
  providers: [FotosService, FotosRepositorio, ArmazenamentoDeFotos],
})
export class FotosModule {}
