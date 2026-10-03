import {
  ESTADOS_ABERTOS,
  type Coleira,
  type Comparacao,
  type Cor,
  type Especie,
  type Pista,
  type Porte,
  type TipoCaso,
  type VereditoPareamento,
} from '@achei/contratos'
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

interface LinhaPista {
  id: string
  veredito: VereditoPareamento
  distanciaM: number
  diasDiferenca: number
  batem: Comparacao[]
  divergem: Comparacao[]
  outroId: string
  outroTipo: TipoCaso
  bairro: string | null
  publicadoEm: Date
  especie: Especie
  porte: Porte
  corDominante: Cor
  coleira: Coleira
  nome: string | null
  foto: string | null
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

  async codigoDoCaso(id: string): Promise<{ codigoEdicaoHash: string | null } | null> {
    const caso = await this.prisma.caso.findUnique({ where: { id }, select: { codigoEdicao: true } })
    return caso && { codigoEdicaoHash: caso.codigoEdicao }
  }

  /** Pares do caso que ainda não foram descartados, cada um visto pelo lado de quem pergunta. */
  async pistasDoCaso(id: string): Promise<Pista[]> {
    const linhas = await this.prisma.$queryRaw<LinhaPista[]>`
      SELECT p.id, p.veredito, p.distancia_m AS "distanciaM", p.dias_diferenca AS "diasDiferenca",
             p.atributos_batem AS batem, p.atributos_divergem AS divergem,
             o.id AS "outroId", o.tipo AS "outroTipo", l.bairro, o.publicado_em AS "publicadoEm",
             a.especie, a.porte, a.cor_dominante AS "corDominante", a.coleira, a.nome,
             (SELECT f.caminho FROM foto f WHERE f.animal_id = a.id ORDER BY f.enviada_em, f.id LIMIT 1) AS foto
        FROM pareamento p
        JOIN caso o ON o.id = CASE WHEN p.caso_perdido_id = ${id}::uuid THEN p.caso_encontrado_id ELSE p.caso_perdido_id END
        JOIN animal a ON a.id = o.animal_id
        JOIN local l ON l.id = o.local_id
       WHERE (p.caso_perdido_id = ${id}::uuid OR p.caso_encontrado_id = ${id}::uuid)
         AND p.veredito <> 'descartado'`
    return linhas.map((linha) => ({
      id: linha.id,
      veredito: linha.veredito,
      distanciaM: linha.distanciaM,
      diasDiferenca: linha.diasDiferenca,
      batem: linha.batem,
      divergem: linha.divergem,
      outro: {
        id: linha.outroId,
        tipo: linha.outroTipo,
        bairro: linha.bairro,
        publicadoEm: linha.publicadoEm.toISOString(),
        animal: {
          especie: linha.especie,
          porte: linha.porte,
          corDominante: linha.corDominante,
          coleira: linha.coleira,
          nome: linha.nome,
        },
        foto: linha.foto,
      },
    }))
  }

  /** Grava a decisão; devolve falso se o par não for deste caso. */
  async decidir(pistaId: string, casoId: string, veredito: VereditoPareamento): Promise<boolean> {
    const { count } = await this.prisma.pareamento.updateMany({
      where: { id: pistaId, OR: [{ casoPerdidoId: casoId }, { casoEncontradoId: casoId }] },
      data: { veredito, decididoEm: new Date() },
    })
    return count > 0
  }
}
