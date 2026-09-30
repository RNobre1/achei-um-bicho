import type { EstadoCaso } from '@achei/contratos'
import { Injectable } from '@nestjs/common'
import { GeoRepositorio } from '../geo/geo.repositorio'
import { PrismaService } from '../prisma/prisma.service'
import type { AvistamentoParaAutor, RegistrarAvistamentoDto } from './dto/registrar-avistamento.dto'

/** O que a API precisa saber do caso para aceitar um aviso ou mostrar os avisos. */
export interface SituacaoDoCaso {
  estado: EstadoCaso
  codigoEdicaoHash: string | null
}

// ponto de GPS de celular na rua: a imprecisão é menor que a de quem marca de memória
const IMPRECISAO_AVISTAMENTO_M = 100

interface LinhaAvistamento {
  id: string
  vistoEm: Date
  registradoEm: Date
  observacao: string | null
  bairro: string | null
  distanciaM: number
}

@Injectable()
export class AvistamentosRepositorio {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoRepositorio,
  ) {}

  async situacao(casoId: string): Promise<SituacaoDoCaso | null> {
    const caso = await this.prisma.caso.findUnique({
      where: { id: casoId },
      select: { estado: true, codigoEdicao: true },
    })
    return caso && { estado: caso.estado as EstadoCaso, codigoEdicaoHash: caso.codigoEdicao }
  }

  /** Grava o aviso e renova a última interação do caso, na mesma transação. */
  async registrar(casoId: string, dados: RegistrarAvistamentoDto): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const localId = await this.geo.inserirLocal(
        {
          ponto: { latitude: dados.latitude, longitude: dados.longitude },
          bairro: dados.bairro,
          raioImprecisaoM: IMPRECISAO_AVISTAMENTO_M,
        },
        tx,
      )
      const avistamento = await tx.avistamento.create({
        data: {
          casoId,
          localId,
          vistoEm: new Date(dados.vistoEm),
          observacao: dados.observacao ?? null,
        },
      })
      await tx.caso.update({ where: { id: casoId }, data: { ultimaInteracaoEm: new Date() } })
      return avistamento.id
    })
  }

  async listarParaAutor(casoId: string): Promise<AvistamentoParaAutor[]> {
    const linhas = await this.prisma.$queryRaw<LinhaAvistamento[]>`
      SELECT av.id, av.visto_em AS "vistoEm", av.criado_em AS "registradoEm", av.observacao,
             la.bairro, ST_Distance(la.ponto, lc.ponto)::int AS "distanciaM"
        FROM avistamento av
        JOIN local la ON la.id = av.local_id
        JOIN caso c ON c.id = av.caso_id
        JOIN local lc ON lc.id = c.local_id
       WHERE av.caso_id = ${casoId}::uuid
       ORDER BY av.visto_em DESC, av.criado_em DESC`
    return linhas.map(({ vistoEm, registradoEm, ...resto }) => ({
      ...resto,
      vistoEm: vistoEm.toISOString(),
      registradoEm: registradoEm.toISOString(),
    }))
  }
}
