import type { NovoAvistamento } from '@achei/contratos'
import { IsISO8601, IsLatitude, IsLongitude, IsOptional, IsString, MaxLength } from 'class-validator'
import { NaoNoFuturo } from '../../comum/nao-no-futuro'

export class RegistrarAvistamentoDto implements NovoAvistamento {
  @IsLatitude() latitude!: number
  @IsLongitude() longitude!: number
  @IsOptional() @IsString() @MaxLength(80) bairro?: string
  @IsISO8601() @NaoNoFuturo() vistoEm!: string
  @IsOptional() @IsString() @MaxLength(500) observacao?: string
}

export type { AvistamentoParaAutor, AvistamentoRegistrado } from '@achei/contratos'
