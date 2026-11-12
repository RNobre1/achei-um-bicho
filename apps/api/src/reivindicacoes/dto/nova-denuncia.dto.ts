import { LIMITES_DE_TEXTO, MOTIVO_DENUNCIA, type MotivoDenuncia, type NovaDenuncia } from '@achei/contratos'
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

export class NovaDenunciaDto implements NovaDenuncia {
  @IsIn([...MOTIVO_DENUNCIA.valores])
  motivo!: MotivoDenuncia

  @IsOptional()
  @IsString()
  @MaxLength(LIMITES_DE_TEXTO.textoDenuncia)
  texto?: string

  @IsOptional()
  @IsUUID()
  reivindicacaoId?: string
}
