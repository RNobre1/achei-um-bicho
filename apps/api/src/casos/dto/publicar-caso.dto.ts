import {
  CODIGO_EDICAO,
  COLEIRA,
  COR,
  ESPECIE,
  LIMITES_DE_TEXTO,
  PORTE,
  TELEFONE,
  TIPO_CASO,
  type Coleira,
  type Cor,
  type Especie,
  type Porte,
  type AnimalNaPublicacao,
  type AutorNaPublicacao,
  type LocalNaPublicacao,
  type NovaPublicacao,
  type PerguntaNaPublicacao,
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
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator'
import { NaoNoFuturo } from '../../comum/nao-no-futuro'
import { SemContatoPublico } from '../../comum/sem-contato-publico'

// Os valores aceitos vêm do manifesto de packages/contratos. Nada de lista aqui.

export class AnimalDto implements AnimalNaPublicacao {
  @IsIn([...ESPECIE.valores]) especie!: Especie
  @IsIn([...PORTE.valores]) porte!: Porte
  @IsIn([...COR.valores]) corDominante!: Cor
  @IsIn([...COLEIRA.valores]) coleira!: Coleira
  @IsOptional() @IsString() @MaxLength(LIMITES_DE_TEXTO.nomeAnimal) @SemContatoPublico() nome?: string
  @IsOptional() @IsBoolean() castrado?: boolean
}

export class LocalDto implements LocalNaPublicacao {
  @IsLatitude() latitude!: number
  @IsLongitude() longitude!: number
  @IsOptional() @IsString() @MaxLength(LIMITES_DE_TEXTO.bairro) @SemContatoPublico() bairro?: string
  @IsOptional() @IsString() @MaxLength(LIMITES_DE_TEXTO.referencia) referencia?: string
}

export class AutorDto implements AutorNaPublicacao {
  @IsString() @IsNotEmpty() @MaxLength(LIMITES_DE_TEXTO.nomePessoa) nome!: string
  @IsOptional() @IsString() @Matches(TELEFONE.expressao, { message: TELEFONE.mensagem }) telefone?: string
}

export class PerguntaDto implements PerguntaNaPublicacao {
  @IsString() @IsNotEmpty() @MaxLength(LIMITES_DE_TEXTO.enunciado) @SemContatoPublico() enunciado!: string
  @IsString() @IsNotEmpty() @MaxLength(LIMITES_DE_TEXTO.resposta) respostaEsperada!: string
}

export class PublicarCasoDto implements NovaPublicacao {
  @IsIn([...TIPO_CASO.valores]) tipo!: TipoCaso

  @ValidateNested() @Type(() => AnimalDto) animal!: AnimalDto
  @ValidateNested() @Type(() => LocalDto) local!: LocalDto
  @ValidateNested() @Type(() => AutorDto) autor!: AutorDto

  @IsISO8601() @NaoNoFuturo() ocorridoEm!: string
  @IsOptional() @IsString() @MaxLength(LIMITES_DE_TEXTO.relato) @SemContatoPublico() relato?: string

  /** Exatamente três, a regra de negócio RN3. */
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => PerguntaDto)
  perguntas!: PerguntaDto[]

  /**
   * Publicação pela fila sem conexão (F9): idCliente e codigoEdicao vêm sempre juntos
   * ou nenhum dos dois vem.
   */
  @ValidateIf((o: PublicarCasoDto) => o.codigoEdicao !== undefined || o.idCliente !== undefined)
  @IsNotEmpty({ message: 'idCliente é obrigatório quando codigoEdicao é informado' })
  @IsUUID(undefined, { message: 'idCliente deve ser um UUID válido' })
  idCliente?: string

  @ValidateIf((o: PublicarCasoDto) => o.idCliente !== undefined || o.codigoEdicao !== undefined)
  @IsNotEmpty({ message: 'codigoEdicao é obrigatório quando idCliente é informado' })
  @Matches(CODIGO_EDICAO.padrao, { message: 'codigoEdicao fora do formato' })
  codigoEdicao?: string
}

export type { CasoPublicado } from '@achei/contratos'
