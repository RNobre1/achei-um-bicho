import { Module } from '@nestjs/common'
import { AvistamentosModule } from './avistamentos/avistamentos.module'
import { CasosModule } from './casos/casos.module'
import { ConfiguracaoModule } from './configuracao.module'
import { PrismaModule } from './prisma/prisma.module'
import { SaudeModule } from './saude/saude.module'

@Module({ imports: [ConfiguracaoModule, PrismaModule, SaudeModule, CasosModule, AvistamentosModule] })
export class AppModule {}
