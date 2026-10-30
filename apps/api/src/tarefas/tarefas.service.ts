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

    return this.prisma.$transaction(async (tx) => {
      // 1. Cobrança: caso em ESTADOS_VIGIADOS, cobrado_em nulo e ultima_interacao_em mais velha que DIAS_ATE_COBRANCA
      const limiteCobranca = new Date(agora.getTime() - diasAteCobranca * 24 * 60 * 60 * 1000)
      const cobrados = await tx.caso.updateMany({
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
      const expiradosCount = await tx.$executeRaw`
        UPDATE caso
           SET estado = 'expirado',
               ultima_interacao_em = ${agora}
         WHERE estado IN (${Prisma.join([...ESTADOS_VIGIADOS])})
           AND cobrado_em IS NOT NULL
           AND cobrado_em <= ${limiteExpiracao}
           AND ultima_interacao_em <= cobrado_em
      `
      const expirados = { count: Number(expiradosCount) }

      // 3. Anonimização: caso resolvido ou expirado encerrado há TAREFA_DIARIA.diasAteAnonimizar dias
      const limiteAnonimizacao = new Date(agora.getTime() - diasAteAnonimizar * 24 * 60 * 60 * 1000)

      const casosParaAnonimizar = await tx.caso.findMany({
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
        },
        select: {
          id: true,
          autorId: true,
          localId: true,
          autor: {
            select: { nome: true, telefone: true },
          },
          local: {
            select: { referencia: true },
          },
          tentativas: {
            select: {
              id: true,
              pessoaId: true,
              referencia: true,
              pessoa: {
                select: { nome: true, telefone: true },
              },
            },
          },
        },
      })

      let anonimizados = 0

      for (const caso of casosParaAnonimizar) {
        const autorPrecisa = caso.autor.nome !== 'Anônimo' || caso.autor.telefone !== null
        const localPrecisa = caso.local.referencia !== null
        const tentativasPrecisam = caso.tentativas.some(
          (t) => t.pessoa.nome !== 'Anônimo' || t.pessoa.telefone !== null || t.referencia !== null,
        )

        if (!autorPrecisa && !localPrecisa && !tentativasPrecisam) {
          continue
        }

        if (autorPrecisa) {
          await tx.pessoa.update({
            where: { id: caso.autorId },
            data: { nome: 'Anônimo', telefone: null },
          })
        }

        if (localPrecisa) {
          await tx.local.update({
            where: { id: caso.localId },
            data: { referencia: null },
          })
        }

        for (const t of caso.tentativas) {
          if (t.pessoa.nome !== 'Anônimo' || t.pessoa.telefone !== null) {
            await tx.pessoa.update({
              where: { id: t.pessoaId },
              data: { nome: 'Anônimo', telefone: null },
            })
          }
          if (t.referencia !== null) {
            await tx.tentativaVerificacao.update({
              where: { id: t.id },
              data: { referencia: null },
            })
          }
        }

        anonimizados++
      }

      return {
        cobrados: cobrados.count,
        expirados: expirados.count,
        anonimizados,
      }
    })
  }
}
