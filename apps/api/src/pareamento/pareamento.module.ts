import { Module } from '@nestjs/common'
import { GeradorDePareamentos } from './gerador-de-pareamentos'
import { PareamentoRepositorio } from './pareamento.repositorio'

@Module({
  providers: [GeradorDePareamentos, PareamentoRepositorio],
  exports: [GeradorDePareamentos],
})
export class PareamentoModule {}
