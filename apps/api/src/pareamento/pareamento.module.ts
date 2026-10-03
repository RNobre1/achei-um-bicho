import { Module } from '@nestjs/common'
import { GeradorDePareamentos } from './gerador-de-pareamentos'
import { PareamentoRepositorio } from './pareamento.repositorio'
import { PistasController } from './pistas.controller'
import { PistasService } from './pistas.service'

@Module({
  controllers: [PistasController],
  providers: [GeradorDePareamentos, PareamentoRepositorio, PistasService],
  exports: [GeradorDePareamentos],
})
export class PareamentoModule {}
