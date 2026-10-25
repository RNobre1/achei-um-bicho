import { TELEFONE, type NovoVereditoDaReivindicacao, type VereditoVerificacao } from '@achei/contratos'
import { IsIn, IsOptional, IsString, Matches } from 'class-validator'

export class NovoVereditoDaReivindicacaoDto implements NovoVereditoDaReivindicacao {
  @IsIn(['aceita', 'recusada'])
  veredito!: Exclude<VereditoVerificacao, 'pendente'>

  @IsOptional()
  @IsString()
  @Matches(TELEFONE.expressao, { message: 'telefone deve ter 10 ou 11 dígitos' })
  telefone?: string
}
