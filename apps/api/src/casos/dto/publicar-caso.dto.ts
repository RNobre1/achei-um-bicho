import {
  COLEIRA,
  COR,
  ESPECIE,
  PORTE,
  TIPO_CASO,
  type Coleira,
  type Cor,
  type Especie,
  type Porte,
  type TipoCaso,
} from '@achei/contratos'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator'

// Os valores aceitos vêm do manifesto de packages/contratos. Nada de lista aqui.

export class AnimalDto {
  @IsIn([...ESPECIE.valores]) especie!: Especie
  @IsIn([...PORTE.valores]) porte!: Porte
  @IsIn([...COR.valores]) corDominante!: Cor
  @IsIn([...COLEIRA.valores]) coleira!: Coleira
  @IsOptional() @IsString() @MaxLength(60) nome?: string
  @IsOptional() @IsBoolean() castrado?: boolean
}

export class LocalDto {
  @IsLatitude() latitude!: number
  @IsLongitude() longitude!: number
  @IsOptional() @IsString() @MaxLength(80) bairro?: string
  @IsOptional() @IsString() @MaxLength(160) referencia?: string
}

export class AutorDto {
  @IsString() @IsNotEmpty() @MaxLength(80) nome!: string
  @IsOptional() @IsString() @MaxLength(20) telefone?: string
}

export class PerguntaDto {
  @IsString() @IsNotEmpty() @MaxLength(160) enunciado!: string
  @IsString() @IsNotEmpty() @MaxLength(160) respostaEsperada!: string
}

export class PublicarCasoDto {
  @IsIn([...TIPO_CASO.valores]) tipo!: TipoCaso

  @ValidateNested() @Type(() => AnimalDto) animal!: AnimalDto
  @ValidateNested() @Type(() => LocalDto) local!: LocalDto
  @ValidateNested() @Type(() => AutorDto) autor!: AutorDto

  @IsISO8601() ocorridoEm!: string
  @IsOptional() @IsString() @MaxLength(600) relato?: string

  /** Exatamente três, a regra de negócio RN3. */
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => PerguntaDto)
  perguntas!: PerguntaDto[]
}

export interface CasoPublicado {
  id: string
  tipo: TipoCaso
  estado: string
  codigoEdicao: string
}
