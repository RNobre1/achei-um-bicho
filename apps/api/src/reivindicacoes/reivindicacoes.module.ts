import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { ReivindicacoesController } from './reivindicacoes.controller'
import { ReivindicacoesRepositorio } from './reivindicacoes.repositorio'
import { ReivindicacoesService } from './reivindicacoes.service'
import { SituacaoController } from './situacao.controller'

@Module({
  imports: [PrismaModule],
  controllers: [ReivindicacoesController, SituacaoController],
  providers: [ReivindicacoesService, ReivindicacoesRepositorio],
  exports: [ReivindicacoesService, ReivindicacoesRepositorio],
})
export class ReivindicacoesModule {}
