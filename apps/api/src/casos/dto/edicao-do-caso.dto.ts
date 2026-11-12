import {
  COLEIRA,
  COR,
  LIMITES_DE_TEXTO,
  PORTE,
  type Coleira,
  type Cor,
  type EdicaoDoCaso,
  type Porte,
} from '@achei/contratos'
import { Type } from 'class-transformer'
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'
import { SemContatoPublico } from '../../comum/sem-contato-publico'

export class AnimalEdicaoDto {
  @IsOptional()
  @IsIn(PORTE.valores, { message: 'porte precisa ser pequeno, medio ou grande' })
  porte?: Porte

  @IsOptional()
  @IsIn(COR.valores, { message: 'cor dominante precisa ser uma das cores do vocabulário' })
  corDominante?: Cor

  @IsOptional()
  @IsIn(COLEIRA.valores, { message: 'situação da coleira precisa ser com, sem ou nao_observado' })
  coleira?: Coleira

  @IsOptional()
  @IsString()
  @MaxLength(LIMITES_DE_TEXTO.nomeAnimal)
  @SemContatoPublico()
  nome?: string

  @IsOptional()
  @IsBoolean()
  castrado?: boolean
}

export class EdicaoDoCasoDto implements EdicaoDoCaso {
  @IsOptional()
  @IsString()
  @MaxLength(LIMITES_DE_TEXTO.relato)
  @SemContatoPublico()
  relato?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => AnimalEdicaoDto)
  animal?: AnimalEdicaoDto
}
