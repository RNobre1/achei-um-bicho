import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { ReivindicacoesController } from './reivindicacoes.controller'
import { ReivindicacoesRepositorio } from './reivindicacoes.repositorio'
import { ReivindicacoesService } from './reivindicacoes.service'

@Module({
  imports: [PrismaModule],
  controllers: [ReivindicacoesController],
  providers: [ReivindicacoesService, ReivindicacoesRepositorio],
  exports: [ReivindicacoesService, ReivindicacoesRepositorio],
})
export class ReivindicacoesModule {}
