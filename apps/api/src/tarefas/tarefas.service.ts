import { createHash, timingSafeEqual } from 'node:crypto'
import {
  ESTADOS_VIGIADOS,
  TAREFA_DIARIA,
  type CicloDeVidaExecutado,
} from '@achei/contratos'
import {
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common'
import type { Configuracao } from '../configuracao'
import { CONFIGURACAO } from '../configuracao.module'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { areaAproximada } from '../geo/area-aproximada'
import { pontoSql } from '../geo/geo.repositorio'

function conferirChave(informada: string | undefined, esperada: string): boolean {
  if (!informada) return false
  const h1 = createHash('sha256').update(informada).digest()
  const h2 = createHash('sha256').update(esperada).digest()
  return timingSafeEqual(h1, h2)
}

@Injectable()
export class TarefasService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIGURACAO) private readonly configuracao: Configuracao,
  ) {}

  async cicloDeVida(chave: string | undefined): Promise<CicloDeVidaExecutado> {
    if (!this.configuracao.tarefasChave) {
      throw new ServiceUnavailableException(
        'tarefas agendadas não configuradas neste ambiente (TAREFAS_CHAVE ausente)',
      )
    }
    if (!conferirChave(chave, this.configuracao.tarefasChave)) {
      throw new ForbiddenException('chave de tarefas não confere')
    }

    const agora = new Date()
    const { diasAteCobranca, diasAteExpirar } = this.configuracao
    const diasAteAnonimizar = TAREFA_DIARIA.diasAteAnonimizar

    // Cada passo roda sozinho e é idempotente (sem transação única para a tarefa)

    // 1. Cobrança: caso em ESTADOS_VIGIADOS, cobrado_em nulo e ultima_interacao_em mais velha que DIAS_ATE_COBRANCA
    const limiteCobranca = new Date(agora.getTime() - diasAteCobranca * 24 * 60 * 60 * 1000)
    const cobrados = await this.prisma.caso.updateMany({
      where: {
        estado: { in: [...ESTADOS_VIGIADOS] },
        cobradoEm: null,
        ultimaInteracaoEm: { lte: limiteCobranca },
      },
      data: {
        cobradoEm: agora,
      },
    })

    // 2. Expiração: caso em ESTADOS_VIGIADOS com cobrado_em mais velho que DIAS_ATE_EXPIRAR - DIAS_ATE_COBRANCA dias
    // (só expira quem foi cobrado e não teve interação após a cobrança)
    const diasAposCobranca = diasAteExpirar - diasAteCobranca
    const limiteExpiracao = new Date(agora.getTime() - diasAposCobranca * 24 * 60 * 60 * 1000)
    const expiradosCount = await this.prisma.$executeRaw`
      UPDATE caso
         SET estado = 'expirado',
             ultima_interacao_em = ${agora}
       WHERE estado IN (${Prisma.join([...ESTADOS_VIGIADOS])})
         AND cobrado_em IS NOT NULL
         AND cobrado_em <= ${limiteExpiracao}
         AND ultima_interacao_em <= cobrado_em
    `
    const expirados = { count: Number(expiradosCount) }

    // 3. Anonimização: filtra no banco os ainda não anonimizados (não em memória)
    const limiteAnonimizacao = new Date(agora.getTime() - diasAteAnonimizar * 24 * 60 * 60 * 1000)

    const casosParaAnonimizar = await this.prisma.caso.findMany({
      where: {
        OR: [
          {
            estado: 'resolvido',
            desfecho: {
              registradoEm: { lte: limiteAnonimizacao },
            },
          },
          {
            estado: 'expirado',
            ultimaInteracaoEm: { lte: limiteAnonimizacao },
          },
        ],
        AND: [
          {
            OR: [
              { autor: { nome: { not: 'Anônimo' } } },
              { autor: { telefone: { not: null } } },
              { local: { referencia: { not: null } } },
              { perguntas: { some: { respostaEsperada: { not: 'anonimizado' } } } },
              { tentativas: { some: { referencia: { not: null } } } },
              { tentativas: { some: { pessoa: { nome: { not: 'Anônimo' } } } } },
              { tentativas: { some: { pessoa: { telefone: { not: null } } } } },
              { tentativas: { some: { respostas: { some: { texto: { not: 'anonimizado' } } } } } },
            ],
          },
        ],
      },
      select: {
        id: true,
        autorId: true,
        localId: true,
        local: {
          select: {
            raioImprecisaoM: true,
          },
        },
        tentativas: {
          select: {
            id: true,
            pessoaId: true,
          },
        },
      },
    })

    let anonimizados = 0

    for (const caso of casosParaAnonimizar) {
      await this.prisma.$transaction(async (tx) => {
        // 1. Anonimizar autor
        await tx.pessoa.update({
          where: { id: caso.autorId },
          data: { nome: 'Anônimo', telefone: null },
        })

        // 2. Anonimizar local (o ponto exato vira centro da área aproximada e referência nula)
        const [ponto] = await tx.$queryRaw<{ latitude: number; longitude: number }[]>`
          SELECT ST_Y(ponto::geometry) AS latitude, ST_X(ponto::geometry) AS longitude
            FROM local
           WHERE id = ${caso.localId}::uuid
        `
        if (ponto) {
          const { centro } = areaAproximada(
            caso.id,
            { latitude: ponto.latitude, longitude: ponto.longitude },
            caso.local.raioImprecisaoM,
          )
          await tx.$executeRaw`
            UPDATE local
               SET ponto = ${pontoSql(centro)},
                   referencia = NULL
             WHERE id = ${caso.localId}::uuid
          `
        } else {
          await tx.local.update({
            where: { id: caso.localId },
            data: { referencia: null },
          })
        }

        // 3. Anonimizar perguntas de verificação
        await tx.perguntaVerificacao.updateMany({
          where: { casoId: caso.id },
          data: { respostaEsperada: 'anonimizado' },
        })

        // 4. Anonimizar tentativas, pessoas reivindicantes e respostas
        for (const t of caso.tentativas) {
          await tx.pessoa.update({
            where: { id: t.pessoaId },
            data: { nome: 'Anônimo', telefone: null },
          })
          await tx.tentativaVerificacao.update({
            where: { id: t.id },
            data: { referencia: null },
          })
          await tx.respostaVerificacao.updateMany({
            where: { tentativaId: t.id },
            data: { texto: 'anonimizado' },
          })
        }
      })

      anonimizados++
    }

    return {
      cobrados: cobrados.count,
      expirados: expirados.count,
      anonimizados,
    }
  }
}
