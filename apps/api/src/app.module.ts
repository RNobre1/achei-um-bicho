import { Module } from '@nestjs/common'
import { AvistamentosModule } from './avistamentos/avistamentos.module'
import { CasosModule } from './casos/casos.module'
import { ConfiguracaoModule } from './configuracao.module'
import { FotosModule } from './fotos/fotos.module'
import { PrismaModule } from './prisma/prisma.module'
import { ReivindicacoesModule } from './reivindicacoes/reivindicacoes.module'
import { SaudeModule } from './saude/saude.module'
import { SegurancaModule } from './seguranca/seguranca.module'
import { TarefasModule } from './tarefas/tarefas.module'

@Module({
  imports: [
    ConfiguracaoModule,
    PrismaModule,
    SaudeModule,
    CasosModule,
    AvistamentosModule,
    FotosModule,
    ReivindicacoesModule,
    SegurancaModule,
    TarefasModule,
  ],
})
export class AppModule {}
