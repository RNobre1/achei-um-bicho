import { MOTIVO_DENUNCIA, type MotivoDenuncia, type NovaDenuncia } from '@achei/contratos'
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

export class NovaDenunciaDto implements NovaDenuncia {
  @IsIn([...MOTIVO_DENUNCIA.valores])
  motivo!: MotivoDenuncia

  @IsOptional()
  @IsString()
  @MaxLength(500)
  texto?: string

  @IsOptional()
  @IsUUID()
  reivindicacaoId?: string
}
