import { Injectable } from '@nestjs/common'
import {
  ESTADOS_ABERTOS,
  type Coleira,
  type Cor,
  type Especie,
  type EstadoCaso,
  type NovoDesfecho,
  type Porte,
  type TipoCaso,
} from '@achei/contratos'
import { Prisma } from '@prisma/client'
import { GeoRepositorio, pontoSql } from '../geo/geo.repositorio'
import type { Ponto } from '../geo/ponto'
import { PrismaService } from '../prisma/prisma.service'
import type { CasoNoMural } from './dto/consultar-mural.dto'
import type { EdicaoDoCasoDto } from './dto/edicao-do-caso.dto'
import type { PublicarCasoDto } from './dto/publicar-caso.dto'

/** Quantos casos o mural traz de uma vez; o suficiente para um bairro. */
const LIMITE_MURAL = 50

interface LinhaMural {
  id: string
  tipo: TipoCaso
  estado: EstadoCaso
  relato: string | null
  publicadoEm: Date
  ocorridoEm: Date
  bairro: string | null
  distanciaM: number
  especie: Especie
  porte: Porte
  corDominante: Cor
  coleira: Coleira
  nome: string | null
  foto: string | null
}

function filtroAbertosNoRaio(centro: Ponto, raioM: number, tipo?: TipoCaso): Prisma.Sql {
  const alvo = pontoSql(centro)
  return Prisma.sql`
    c.estado IN (${Prisma.join([...ESTADOS_ABERTOS])})
    AND ST_DWithin(l.ponto, ${alvo}, ${raioM}::float8)
    ${tipo ? Prisma.sql`AND c.tipo = ${tipo}` : Prisma.empty}`
}

/** Caso com o ponto real, que só existe dentro da API para calcular a área aproximada. */
export interface CasoComPonto {
  id: string
  tipo: TipoCaso
  estado: EstadoCaso
  relato: string | null
  ocorridoEm: Date
  publicadoEm: Date
  especie: Especie
  porte: Porte
  corDominante: Cor
  coleira: Coleira
  nome: string | null
  castrado: boolean | null
  bairro: string | null
  raioImprecisaoM: number
  latitude: number
  longitude: number
}

export interface NovoCaso {
  dados: PublicarCasoDto
  estado: EstadoCaso
  codigoEdicaoHash: string
}

export function dadosDeRenovacao(agora: Date = new Date()) {
  return {
    ultimaInteracaoEm: agora,
    cobradoEm: null,
  }
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
             a.especie, a.porte, a.cor_dominante AS "corDominante", a.coleira, a.nome,
             (SELECT f.caminho FROM foto f WHERE f.animal_id = a.id
               ORDER BY f.enviada_em, f.id LIMIT 1) AS foto
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

  async buscarComPonto(id: string): Promise<CasoComPonto | null> {
    const [linha] = await this.prisma.$queryRaw<CasoComPonto[]>`
      SELECT c.id, c.tipo, c.estado, c.relato,
             c.ocorrido_em AS "ocorridoEm", c.publicado_em AS "publicadoEm",
             a.especie, a.porte, a.cor_dominante AS "corDominante", a.coleira, a.nome, a.castrado,
             l.bairro, l.raio_imprecisao_m AS "raioImprecisaoM",
             ST_Y(l.ponto::geometry) AS latitude, ST_X(l.ponto::geometry) AS longitude
        FROM caso c
        JOIN animal a ON a.id = c.animal_id
        JOIN local l ON l.id = c.local_id
       WHERE c.id = ${id}::uuid`
    return linha ?? null
  }

  async fotosDoCaso(id: string): Promise<string[]> {
    const linhas = await this.prisma.$queryRaw<{ caminho: string }[]>`
      SELECT f.caminho
        FROM foto f
        JOIN caso c ON c.animal_id = f.animal_id
       WHERE c.id = ${id}::uuid
       ORDER BY f.enviada_em, f.id`
    return linhas.map((linha) => linha.caminho)
  }

  async buscarParaSituacao(id: string) {
    return this.prisma.caso.findUnique({
      where: { id },
      select: {
        id: true,
        tipo: true,
        estado: true,
        codigoEdicao: true,
        ultimaInteracaoEm: true,
        cobradoEm: true,
        desfecho: {
          select: {
            tipo: true,
            ocorridoEm: true,
          },
        },
        _count: {
          select: {
            tentativas: {
              where: { veredito: 'pendente' },
            },
          },
        },
      },
    })
  }

  async confirmar(id: string): Promise<void> {
    await this.prisma.caso.update({
      where: { id },
      data: dadosDeRenovacao(),
    })
  }

  async reabrir(id: string, novoEstado: EstadoCaso): Promise<void> {
    await this.prisma.caso.update({
      where: { id },
      data: {
        estado: novoEstado,
        ...dadosDeRenovacao(),
      },
    })
  }

  async encerrarComDesfecho(casoId: string, dados: NovoDesfecho): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      const desfecho = await tx.desfecho.create({
        data: {
          casoId,
          tipo: dados.tipo,
          ocorridoEm: new Date(dados.ocorridoEm),
        },
      })
      await tx.caso.update({
        where: { id: casoId },
        data: {
          estado: 'resolvido',
          ultimaInteracaoEm: new Date(),
        },
      })
      return { id: desfecho.id }
    })
  }

  async buscarParaEdicao(id: string) {
    return this.prisma.caso.findUnique({
      where: { id },
      select: {
        id: true,
        estado: true,
        codigoEdicao: true,
        animal: {
          select: {
            id: true,
            porte: true,
            corDominante: true,
            coleira: true,
          },
        },
      },
    })
  }

  async editar(id: string, animalId: string, dados: EdicaoDoCasoDto): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const dataCaso: Prisma.CasoUpdateInput = { ...dadosDeRenovacao() }
      if (dados.relato !== undefined) dataCaso.relato = dados.relato

      await tx.caso.update({ where: { id }, data: dataCaso })

      if (dados.animal) {
        await tx.animal.update({
          where: { id: animalId },
          data: {
            porte: dados.animal.porte,
            corDominante: dados.animal.corDominante,
            coleira: dados.animal.coleira,
            nome: dados.animal.nome,
            castrado: dados.animal.castrado,
          },
        })
      }
    })
  }
}
