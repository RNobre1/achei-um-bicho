import { LIMITES_DE_TEXTO, type NovoAvistamento } from '@achei/contratos'
import { IsISO8601, IsLatitude, IsLongitude, IsOptional, IsString, MaxLength } from 'class-validator'
import { NaoNoFuturo } from '../../comum/nao-no-futuro'
import { SemContatoPublico } from '../../comum/sem-contato-publico'

export class RegistrarAvistamentoDto implements NovoAvistamento {
  @IsLatitude() latitude!: number
  @IsLongitude() longitude!: number
  @IsOptional() @IsString() @MaxLength(LIMITES_DE_TEXTO.bairro) bairro?: string
  @IsISO8601() @NaoNoFuturo() vistoEm!: string
  @IsOptional() @IsString() @MaxLength(LIMITES_DE_TEXTO.observacao) @SemContatoPublico() observacao?: string
}

export type { AvistamentoParaAutor, AvistamentoRegistrado } from '@achei/contratos'
