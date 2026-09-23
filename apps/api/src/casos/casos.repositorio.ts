import { Injectable } from '@nestjs/common'
import type { EstadoCaso } from '@achei/contratos'
import { GeoRepositorio } from '../geo/geo.repositorio'
import { PrismaService } from '../prisma/prisma.service'
import type { PublicarCasoDto } from './dto/publicar-caso.dto'

export interface NovoCaso {
  dados: PublicarCasoDto
  estado: EstadoCaso
  codigoEdicaoHash: string
}

@Injectable()
export class CasosRepositorio {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoRepositorio,
  ) {}

  /** Grava pessoa, local, animal, caso e perguntas numa transação só: ou tudo, ou nada. */
  async criar({ dados, estado, codigoEdicaoHash }: NovoCaso): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const autor = await tx.pessoa.create({
        data: { nome: dados.autor.nome, telefone: dados.autor.telefone ?? null },
      })
      const localId = await this.geo.inserirLocal(
        {
          ponto: { latitude: dados.local.latitude, longitude: dados.local.longitude },
          bairro: dados.local.bairro,
          referencia: dados.local.referencia,
        },
        tx,
      )
      const animal = await tx.animal.create({ data: dados.animal })
      const caso = await tx.caso.create({
        data: {
          tipo: dados.tipo,
          estado,
          autorId: autor.id,
          animalId: animal.id,
          localId,
          codigoEdicao: codigoEdicaoHash,
          relato: dados.relato ?? null,
          ocorridoEm: new Date(dados.ocorridoEm),
          perguntas: {
            create: dados.perguntas.map((pergunta, indice) => ({
              ordem: indice + 1,
              enunciado: pergunta.enunciado,
              respostaEsperada: pergunta.respostaEsperada,
            })),
          },
        },
      })
      return caso.id
    })
  }
}
