import { Global, Module } from '@nestjs/common'
import { lerConfiguracao } from './configuracao'

export const CONFIGURACAO = Symbol('CONFIGURACAO')

@Global()
@Module({
  providers: [{ provide: CONFIGURACAO, useFactory: () => lerConfiguracao() }],
  exports: [CONFIGURACAO],
})
export class ConfiguracaoModule {}
