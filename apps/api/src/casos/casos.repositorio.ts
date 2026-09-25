import { Injectable } from '@nestjs/common'
import { ESTADOS_ABERTOS, type EstadoCaso, type TipoCaso } from '@achei/contratos'
import { Prisma } from '@prisma/client'
import { GeoRepositorio, pontoSql } from '../geo/geo.repositorio'
import type { Ponto } from '../geo/ponto'
import { PrismaService } from '../prisma/prisma.service'
import type { CasoNoMural } from './dto/consultar-mural.dto'
import type { PublicarCasoDto } from './dto/publicar-caso.dto'

/** Quantos casos o mural traz de uma vez; o suficiente para um bairro. */
const LIMITE_MURAL = 50

interface LinhaMural {
  id: string
  tipo: string
  estado: string
  relato: string | null
  publicadoEm: Date
  ocorridoEm: Date
  bairro: string | null
  distanciaM: number
  especie: string
  porte: string
  corDominante: string
  coleira: string
  nome: string | null
}

function filtroAbertosNoRaio(centro: Ponto, raioM: number, tipo?: TipoCaso): Prisma.Sql {
  const alvo = pontoSql(centro)
  return Prisma.sql`
    c.estado IN (${Prisma.join([...ESTADOS_ABERTOS])})
    AND ST_DWithin(l.ponto, ${alvo}, ${raioM}::float8)
    ${tipo ? Prisma.sql`AND c.tipo = ${tipo}` : Prisma.empty}`
}

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

  async abertosNoRaio(centro: Ponto, raioM: number, tipo?: TipoCaso): Promise<CasoNoMural[]> {
    const linhas = await this.prisma.$queryRaw<LinhaMural[]>`
      SELECT c.id, c.tipo, c.estado, c.relato,
             c.publicado_em AS "publicadoEm", c.ocorrido_em AS "ocorridoEm",
             l.bairro, ST_Distance(l.ponto, ${pontoSql(centro)})::int AS "distanciaM",
             a.especie, a.porte, a.cor_dominante AS "corDominante", a.coleira, a.nome
        FROM caso c
        JOIN local l ON l.id = c.local_id
        JOIN animal a ON a.id = c.animal_id
       WHERE ${filtroAbertosNoRaio(centro, raioM, tipo)}
       ORDER BY "distanciaM"
       LIMIT ${LIMITE_MURAL}`
    return linhas.map(({ especie, porte, corDominante, coleira, nome, publicadoEm, ocorridoEm, ...resto }) => ({
      ...resto,
      publicadoEm: publicadoEm.toISOString(),
      ocorridoEm: ocorridoEm.toISOString(),
      animal: { especie, porte, corDominante, coleira, nome },
    }))
  }

  async contarAbertosNoRaio(centro: Ponto, raioM: number, tipo?: TipoCaso): Promise<number> {
    const [linha] = await this.prisma.$queryRaw<{ total: number }[]>`
      SELECT count(*)::int AS total
        FROM caso c
        JOIN local l ON l.id = c.local_id
       WHERE ${filtroAbertosNoRaio(centro, raioM, tipo)}`
    return linha?.total ?? 0
  }
}
