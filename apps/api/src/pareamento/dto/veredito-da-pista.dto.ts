import type { NovoVereditoDaPista } from '@achei/contratos'
import { IsIn } from 'class-validator'

export class VereditoDaPistaDto implements NovoVereditoDaPista {
  /** Só "descartado" por enquanto: confirmar que é o mesmo bicho passa pela verificação (F6). */
  @IsIn(['descartado']) veredito!: 'descartado'
}
