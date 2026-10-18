import { Injectable, NotFoundException } from '@nestjs/common'
import type { PerguntaPublica } from '@achei/contratos'
import { ReivindicacoesRepositorio } from './reivindicacoes.repositorio'

@Injectable()
export class ReivindicacoesService {
  constructor(private readonly repositorio: ReivindicacoesRepositorio) {}

  async listarPerguntas(casoId: string): Promise<PerguntaPublica[]> {
    const perguntas = await this.repositorio.perguntasDoCaso(casoId)
    if (!perguntas) throw new NotFoundException('caso não encontrado')
    return perguntas
  }
}
