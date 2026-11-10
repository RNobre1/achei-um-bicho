import { type ExecutionContext, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { type Configuracao } from '../configuracao'
import { CONFIGURACAO } from '../configuracao.module'
import { LimiteRequisicoesGuard } from './limite-requisicoes.guard'

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [CONFIGURACAO],
      useFactory: (config: Configuracao) => [
        {
          name: 'leitura',
          ttl: 60_000,
          limit: config.limiteLeituraPorMinuto,
          skipIf: (context: ExecutionContext) => {
            const req = context.switchToHttp().getRequest()
            return req.method !== 'GET' && req.method !== 'HEAD'
          },
        },
        {
          name: 'escrita',
          ttl: 60_000,
          limit: config.limiteEscritaPorMinuto,
          skipIf: (context: ExecutionContext) => {
            const req = context.switchToHttp().getRequest()
            return req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'
          },
        },
      ],
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: LimiteRequisicoesGuard,
    },
  ],
})
export class SegurancaModule {}
