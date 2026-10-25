import { TELEFONE, type NovaReivindicacao } from '@achei/contratos'
import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator'

export class RespostaItemDto {
  @IsUUID()
  perguntaId!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  texto!: string
}

export class PessoaReivindicacaoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nome!: string

  @IsString()
  @Matches(TELEFONE.expressao, { message: 'telefone deve ter 10 ou 11 dígitos' })
  telefone!: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  referencia?: string
}

export class CasoProprioDto {
  @IsUUID()
  id!: string

  @IsString()
  @IsNotEmpty()
  codigoEdicao!: string
}

export class NovaReivindicacaoDto implements NovaReivindicacao {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RespostaItemDto)
  respostas!: RespostaItemDto[]

  @ValidateNested()
  @Type(() => PessoaReivindicacaoDto)
  pessoa!: PessoaReivindicacaoDto

  @IsOptional()
  @ValidateNested()
  @Type(() => CasoProprioDto)
  casoProprio?: CasoProprioDto
}
