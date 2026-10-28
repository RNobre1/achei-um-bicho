import { TIPO_DESFECHO, type NovoDesfecho, type TipoDesfecho } from '@achei/contratos'
import { IsDateString, IsIn } from 'class-validator'
import { NaoNoFuturo } from '../../comum/nao-no-futuro'

export class NovoDesfechoDto implements NovoDesfecho {
  @IsIn(TIPO_DESFECHO.valores, {
    message: 'tipo de desfecho precisa ser voltou_para_casa, foi_adotado ou nao_encontrado',
  })
  tipo: TipoDesfecho

  @IsDateString({}, { message: 'ocorridoEm precisa ser uma data ISO 8601' })
  @NaoNoFuturo()
  ocorridoEm: string
}
