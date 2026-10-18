import { Injectable } from '@nestjs/common'
import type { PerguntaPublica } from '@achei/contratos'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ReivindicacoesRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async casoExiste(casoId: string): Promise<boolean> {
    const caso = await this.prisma.caso.findUnique({
      where: { id: casoId },
      select: { id: true },
    })
    return Boolean(caso)
  }

  async perguntasDoCaso(casoId: string): Promise<PerguntaPublica[] | null> {
    const caso = await this.prisma.caso.findUnique({
      where: { id: casoId },
      select: {
        perguntas: {
          orderBy: { ordem: 'asc' },
          select: { id: true, ordem: true, enunciado: true },
        },
      },
    })
    return caso ? caso.perguntas : null
  }
}
