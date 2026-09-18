import { Injectable } from '@nestjs/common'
import { Prisma, type PrismaClient } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { Ponto } from './ponto'

/** Qualquer cliente capaz de rodar SQL: o serviço ou uma transação aberta. */
export type ClienteSql = Pick<PrismaClient, '$queryRaw'>

export interface NovoLocal {
  ponto: Ponto
  bairro?: string | null
  referencia?: string | null
  raioImprecisaoM?: number
}

export interface LocalNoRaio {
  localId: string
  distanciaM: number
}

function pontoSql({ latitude, longitude }: Ponto): Prisma.Sql {
  return Prisma.sql`ST_SetSRID(ST_MakePoint(${longitude}::float8, ${latitude}::float8), 4326)::geography`
}

/**
 * Consulta de locais dentro do raio, ordenados por distância.
 *
 * O filtro é ST_DWithin, e não ST_Distance no WHERE: só o primeiro usa o índice
 * GIST. ST_Distance aparece apenas no SELECT, para devolver os metros.
 */
export function sqlLocaisNoRaio(centro: Ponto, raioM: number): Prisma.Sql {
  const alvo = pontoSql(centro)
  return Prisma.sql`
    SELECT id AS "localId", ST_Distance(ponto, ${alvo})::int AS "distanciaM"
      FROM local
     WHERE ST_DWithin(ponto, ${alvo}, ${raioM}::float8)
     ORDER BY "distanciaM"`
}

@Injectable()
export class GeoRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async inserirLocal(dados: NovoLocal, cliente: ClienteSql = this.prisma): Promise<string> {
    const linhas = await cliente.$queryRaw<{ id: string }[]>`
      INSERT INTO local (ponto, bairro, referencia, raio_imprecisao_m)
      VALUES (${pontoSql(dados.ponto)}, ${dados.bairro ?? null}, ${dados.referencia ?? null},
              ${dados.raioImprecisaoM ?? 300})
      RETURNING id`
    return linhas[0]!.id
  }

  async locaisNoRaio(centro: Ponto, raioM: number, cliente: ClienteSql = this.prisma): Promise<LocalNoRaio[]> {
    return cliente.$queryRaw<LocalNoRaio[]>(sqlLocaisNoRaio(centro, raioM))
  }
}
