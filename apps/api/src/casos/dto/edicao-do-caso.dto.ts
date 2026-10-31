import {
  COLEIRA,
  COR,
  PORTE,
  type Coleira,
  type Cor,
  type EdicaoDoCaso,
  type Porte,
} from '@achei/contratos'
import { Type } from 'class-transformer'
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'

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
  @MaxLength(60)
  nome?: string

  @IsOptional()
  @IsBoolean()
  castrado?: boolean
}

export class EdicaoDoCasoDto implements EdicaoDoCaso {
  @IsOptional()
  @IsString()
  @MaxLength(600)
  relato?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => AnimalEdicaoDto)
  animal?: AnimalEdicaoDto
}
