import { type ExecutionContext, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { type Configuracao } from '../configuracao'
import { CONFIGURACAO } from '../configuracao.module'
import { LimiteRequisicoesGuard } from './limite-requisicoes.guard'

export const MENSAGEM_429 = 'Muitas tentativas em pouco tempo. Espere um minuto e tente de novo.'

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [CONFIGURACAO],
      useFactory: (config: Configuracao) => ({
        errorMessage: MENSAGEM_429,
        throttlers: [
          {
            name: 'fotos',
            ttl: 60_000,
            limit: config.limiteFotosPorMinuto,
            skipIf: (context: ExecutionContext) => {
              const req = context.switchToHttp().getRequest()
              const url = req.originalUrl || req.url || ''
              const caminho = url.split('?')[0]
              return (req.method !== 'GET' && req.method !== 'HEAD') || !caminho.startsWith('/fotos/')
            },
          },
          {
            name: 'leitura',
            ttl: 60_000,
            limit: config.limiteLeituraPorMinuto,
            skipIf: (context: ExecutionContext) => {
              const req = context.switchToHttp().getRequest()
              const url = req.originalUrl || req.url || ''
              const caminho = url.split('?')[0]
              return (req.method !== 'GET' && req.method !== 'HEAD') || caminho.startsWith('/fotos/')
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
