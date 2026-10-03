import { ESTADOS_ABERTOS, type Coleira, type Cor, type Porte, type TipoCaso } from '@achei/contratos'
import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { ResultadoDaComparacao } from './comparar'

/** Um caso como a comparação o enxerga: lado, atributos e quando aconteceu. */
export interface CasoParaComparar {
  id: string
  tipo: TipoCaso
  porte: Porte
  corDominante: Cor
  coleira: Coleira
  ocorridoEm: Date
}

export interface Candidato extends CasoParaComparar {
  distanciaM: number
}

export interface NovoPar extends ResultadoDaComparacao {
  casoPerdidoId: string
  casoEncontradoId: string
  distanciaM: number
}

@Injectable()
export class PareamentoRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async caso(id: string): Promise<CasoParaComparar | null> {
    const [linha] = await this.prisma.$queryRaw<CasoParaComparar[]>`
      SELECT c.id, c.tipo, a.porte, a.cor_dominante AS "corDominante", a.coleira, c.ocorrido_em AS "ocorridoEm"
        FROM caso c JOIN animal a ON a.id = c.animal_id
       WHERE c.id = ${id}::uuid`
    return linha ?? null
  }

  /**
   * Casos abertos do lado oposto, da mesma espécie, até o raio dado (RN7). O filtro
   * de distância é ST_DWithin, que usa o índice GIST do local.
   */
  async candidatos(id: string, raioM: number): Promise<Candidato[]> {
    return this.prisma.$queryRaw<Candidato[]>`
      SELECT c.id, c.tipo, a.porte, a.cor_dominante AS "corDominante", a.coleira,
             c.ocorrido_em AS "ocorridoEm", ST_Distance(l.ponto, l0.ponto)::int AS "distanciaM"
        FROM caso c0
        JOIN animal a0 ON a0.id = c0.animal_id
        JOIN local l0 ON l0.id = c0.local_id
        JOIN caso c ON c.tipo <> c0.tipo AND c.id <> c0.id
        JOIN animal a ON a.id = c.animal_id AND a.especie = a0.especie
        JOIN local l ON l.id = c.local_id
       WHERE c0.id = ${id}::uuid
         AND c.estado IN (${Prisma.join([...ESTADOS_ABERTOS])})
         AND ST_DWithin(l.ponto, l0.ponto, ${raioM}::float8)`
  }

  /** Par que já existe fica como está: a decisão de uma pessoa sobre ele não se perde. */
  async gravar(pares: NovoPar[]): Promise<void> {
    if (pares.length === 0) return
    await this.prisma.pareamento.createMany({
      data: pares.map((par) => ({
        casoPerdidoId: par.casoPerdidoId,
        casoEncontradoId: par.casoEncontradoId,
        distanciaM: par.distanciaM,
        diasDiferenca: par.diasDiferenca,
        atributosBatem: par.batem as unknown as Prisma.InputJsonValue,
        atributosDivergem: par.divergem as unknown as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    })
  }
}
