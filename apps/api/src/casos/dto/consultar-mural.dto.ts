import { RAIO, TIPO_CASO, type TipoCaso } from '@achei/contratos'
import { Type } from 'class-transformer'
import { IsIn, IsInt, IsLatitude, IsLongitude, IsOptional, Max, Min } from 'class-validator'

export class ConsultarMuralDto {
  @Type(() => Number) @IsLatitude() latitude!: number
  @Type(() => Number) @IsLongitude() longitude!: number

  /** Metros. Sem valor, vale o raio padrão da configuração. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(RAIO.minimoM) @Max(RAIO.maximoM)
  raio?: number

  @IsOptional() @IsIn([...TIPO_CASO.valores]) tipo?: TipoCaso
}

export interface CasoNoMural {
  id: string
  tipo: string
  estado: string
  relato: string | null
  publicadoEm: string
  ocorridoEm: string
  bairro: string | null
  distanciaM: number
  animal: {
    especie: string
    porte: string
    corDominante: string
    coleira: string
    nome: string | null
  }
}

export interface Mural {
  raioM: number
  casos: CasoNoMural[]
  /** Quantos casos abertos existem até o raio máximo; o mural vazio usa para oferecer ampliar. */
  totalNoRaioMaximo: number
}
