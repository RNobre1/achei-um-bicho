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
  InternalServerErrorException,
  Logger,
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

interface CasoParaAnonimizacao {
  id: string
  autorId: string
  localId: string
  raioImprecisaoM: number
}

function filtroSqlDeAnonimizacao(limite: Date): Prisma.Sql {
  return Prisma.sql`
    (
      (
        c.estado = 'resolvido'
        AND EXISTS (
          SELECT 1
            FROM desfecho d
           WHERE d.caso_id = c.id
             AND d.registrado_em <= ${limite}
        )
      )
      OR (
        c.estado = 'expirado'
        AND c.ultima_interacao_em <= ${limite}
      )
    )
    AND (
      autor.nome <> 'Anônimo'
      OR autor.telefone IS NOT NULL
      OR l.referencia IS NOT NULL
      OR EXISTS (
        SELECT 1
          FROM pergunta_verificacao q
         WHERE q.caso_id = c.id
           AND q.resposta_esperada <> 'anonimizado'
      )
      OR EXISTS (
        SELECT 1
          FROM tentativa_verificacao t
          JOIN pessoa reivindicante ON reivindicante.id = t.pessoa_id
         WHERE t.caso_id = c.id
           AND (
             t.referencia IS NOT NULL
             OR reivindicante.nome <> 'Anônimo'
             OR reivindicante.telefone IS NOT NULL
           )
      )
      OR EXISTS (
        SELECT 1
          FROM resposta_verificacao r
          JOIN tentativa_verificacao t ON t.id = r.tentativa_id
         WHERE t.caso_id = c.id
           AND r.texto <> 'anonimizado'
      )
    )
  `
}

@Injectable()
export class TarefasService {
  private readonly logger = new Logger(TarefasService.name)

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
      select: { id: true },
    })

    let anonimizados = 0
    let falhas = 0

    for (const candidato of casosParaAnonimizar) {
      try {
        const anonimizado = await this.prisma.$transaction(async (tx) => {
          // Serializa execuções que já listaram o mesmo candidato antes de qualquer uma anonimizar.
          const [bloqueio] = await tx.$queryRaw<{ id: string }[]>`
            SELECT id
              FROM caso
             WHERE id = ${candidato.id}::uuid
             FOR UPDATE
          `
          if (!bloqueio) return false

          // Revalida no banco sob o bloqueio usando o mesmo critério de idade e dados remanescentes.
          const [caso] = await tx.$queryRaw<CasoParaAnonimizacao[]>`
            SELECT c.id,
                   c.autor_id AS "autorId",
                   c.local_id AS "localId",
                   l.raio_imprecisao_m AS "raioImprecisaoM"
              FROM caso c
              JOIN pessoa autor ON autor.id = c.autor_id
              JOIN local l ON l.id = c.local_id
             WHERE c.id = ${candidato.id}::uuid
               AND ${filtroSqlDeAnonimizacao(limiteAnonimizacao)}
             FOR UPDATE OF c
          `
          if (!caso) return false

          const tentativas = await tx.tentativaVerificacao.findMany({
            where: { casoId: caso.id },
            select: { id: true, pessoaId: true },
          })

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
              caso.raioImprecisaoM,
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
          for (const tentativa of tentativas) {
            await tx.pessoa.update({
              where: { id: tentativa.pessoaId },
              data: { nome: 'Anônimo', telefone: null },
            })
            await tx.tentativaVerificacao.update({
              where: { id: tentativa.id },
              data: { referencia: null },
            })
            await tx.respostaVerificacao.updateMany({
              where: { tentativaId: tentativa.id },
              data: { texto: 'anonimizado' },
            })
          }

          return true
        })

        if (anonimizado) anonimizados++
      } catch (erro) {
        // o id do caso não identifica ninguém; o erro vai só pelo nome da classe, sem dados
        falhas++
        this.logger.error(`falha ao anonimizar o caso ${candidato.id}: ${(erro as Error)?.constructor?.name ?? 'Error'}`)
      }
    }

    // cobrança, expiração e os demais casos já foram feitos; a falha precisa aparecer na ação agendada
    if (falhas > 0) {
      throw new InternalServerErrorException(`${falhas} caso(s) não puderam ser anonimizados`)
    }

    return {
      cobrados: cobrados.count,
      expirados: expirados.count,
      anonimizados,
    }
  }
}
