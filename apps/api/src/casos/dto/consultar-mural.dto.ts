import { RAIO, TIPO_CASO, type ConsultaMural, type TipoCaso } from '@achei/contratos'
import { Type } from 'class-transformer'
import { IsIn, IsInt, IsLatitude, IsLongitude, IsOptional, Max, Min } from 'class-validator'

export class ConsultarMuralDto implements ConsultaMural {
  @Type(() => Number) @IsLatitude() latitude!: number
  @Type(() => Number) @IsLongitude() longitude!: number

  /** Metros. Sem valor, vale o raio padrão da configuração. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(RAIO.minimoM) @Max(RAIO.maximoM)
  raio?: number

  @IsOptional() @IsIn([...TIPO_CASO.valores]) tipo?: TipoCaso
}

export type { CasoNoMural, Mural } from '@achei/contratos'
