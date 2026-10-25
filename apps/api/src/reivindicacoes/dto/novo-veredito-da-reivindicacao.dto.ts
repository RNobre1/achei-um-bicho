import { TELEFONE, type NovoVereditoDaReivindicacao, type VereditoVerificacao } from '@achei/contratos'
import { IsIn, IsOptional, IsString, Matches } from 'class-validator'

export class NovoVereditoDaReivindicacaoDto implements NovoVereditoDaReivindicacao {
  @IsIn(['aceita', 'recusada'])
  veredito!: Exclude<VereditoVerificacao, 'pendente'>

  @IsOptional()
  @IsString()
  @Matches(TELEFONE.expressao, { message: TELEFONE.mensagem })
  telefone?: string
}
