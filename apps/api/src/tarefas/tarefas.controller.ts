import { CABECALHO_CHAVE_TAREFAS, type CicloDeVidaExecutado } from '@achei/contratos'
import { Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { TarefasService } from './tarefas.service'

@Controller('tarefas')
export class TarefasController {
  constructor(private readonly tarefas: TarefasService) {}

  @Post('ciclo-de-vida')
  @HttpCode(HttpStatus.OK)
  cicloDeVida(@Headers(CABECALHO_CHAVE_TAREFAS) chave?: string): Promise<CicloDeVidaExecutado> {
    return this.tarefas.cicloDeVida(chave)
  }
}
