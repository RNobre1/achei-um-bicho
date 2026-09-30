import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

export interface SituacaoParaFoto {
  codigoEdicaoHash: string | null
  animalId: string
  totalDeFotos: number
}

export interface NovaFoto {
  id: string
  animalId: string
  caminho: string
  largura: number
  altura: number
}

@Injectable()
export class FotosRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async situacao(casoId: string): Promise<SituacaoParaFoto | null> {
    const caso = await this.prisma.caso.findUnique({
      where: { id: casoId },
      select: { codigoEdicao: true, animalId: true, animal: { select: { _count: { select: { fotos: true } } } } },
    })
    return (
      caso && {
        codigoEdicaoHash: caso.codigoEdicao,
        animalId: caso.animalId,
        totalDeFotos: caso.animal._count.fotos,
      }
    )
  }

  async registrar(foto: NovaFoto): Promise<void> {
    await this.prisma.foto.create({ data: foto })
  }
}
