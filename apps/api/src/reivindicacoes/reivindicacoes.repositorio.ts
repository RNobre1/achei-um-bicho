import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import {
  ESTADOS_ABERTOS,
  ESTADOS_VIGIADOS,
  REIVINDICACAO,
  TELEFONE,
  type EstadoCaso,
  type PerguntaPublica,
  type ReivindicacaoParaAutor,
  type TipoCaso,
  type VereditoVerificacao,
} from '@achei/contratos'
import { Prisma } from '@prisma/client'
import { dadosDeRenovacao } from '../casos/renovacao'
import { PrismaService } from '../prisma/prisma.service'
import type { NovaDenunciaDto } from './dto/nova-denuncia.dto'
import type { NovaReivindicacaoDto } from './dto/nova-reivindicacao.dto'

export interface DadosParaReivindicar {
  casoId: string
  dados: NovaReivindicacaoDto
  codigoAcompanhamentoHash: string
}

export interface ReivindicacaoCriada {
  id: string
  veredito: VereditoVerificacao
}

export interface GravarVereditoParams {
  tentativaId: string
  casoId: string
  veredito: 'aceita' | 'recusada'
  novoTelefoneAutor?: string
  autorJaTinhaTelefone?: boolean
  casoProprioId?: string | null
  autorId?: string
}

@Injectable()
export class ReivindicacoesRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async casoExiste(casoId: string): Promise<boolean> {
    const caso = await this.prisma.caso.findUnique({
      where: { id: casoId },
      select: { id: true },
    })
    return Boolean(caso)
  }

  async buscarCasoParaReivindicar(casoId: string) {
    return this.prisma.caso.findUnique({
      where: { id: casoId },
      select: {
        id: true,
        tipo: true,
        estado: true,
        perguntas: {
          select: { id: true },
        },
      },
    })
  }

  async buscarCasoProprio(casoId: string) {
    return this.prisma.caso.findUnique({
      where: { id: casoId },
      select: {
        id: true,
        tipo: true,
        estado: true,
        codigoEdicao: true,
      },
    })
  }

  async buscarPareamentoEntreCasos(caso1Id: string, caso2Id: string) {
    return this.prisma.pareamento.findFirst({
      where: {
        OR: [
          { casoPerdidoId: caso1Id, casoEncontradoId: caso2Id },
          { casoPerdidoId: caso2Id, casoEncontradoId: caso1Id },
        ],
      },
      select: { id: true, veredito: true },
    })
  }

  async buscarCasoComAutoria(casoId: string) {
    return this.prisma.caso.findUnique({
      where: { id: casoId },
      select: {
        id: true,
        tipo: true,
        estado: true,
        codigoEdicao: true,
        autor: {
          select: { id: true, telefone: true },
        },
      },
    })
  }

  async perguntasDoCaso(casoId: string): Promise<PerguntaPublica[] | null> {
    const caso = await this.prisma.caso.findUnique({
      where: { id: casoId },
      select: {
        perguntas: {
          orderBy: { ordem: 'asc' },
          select: { id: true, ordem: true, enunciado: true },
        },
      },
    })
    return caso ? caso.perguntas : null
  }

  async criarReivindicacao({
    casoId,
    dados,
    codigoAcompanhamentoHash,
  }: DadosParaReivindicar): Promise<ReivindicacaoCriada> {
    return this.prisma.$transaction(async (tx) => {
      const casoTravado = await tx.$queryRaw<{ id: string; estado: string }[]>`
        SELECT id, estado FROM caso WHERE id = ${casoId}::uuid FOR UPDATE
      `
      const caso = casoTravado?.[0]
      if (!caso) {
        throw new NotFoundException('caso não encontrado')
      }
      if (!ESTADOS_ABERTOS.includes(caso.estado as EstadoCaso)) {
        throw new ConflictException('só casos abertos aceitam novas reivindicações')
      }

      const totalPendentes = await tx.tentativaVerificacao.count({
        where: { casoId, veredito: 'pendente' },
      })
      if (totalPendentes >= REIVINDICACAO.maximoPendentesPorCaso) {
        throw new ConflictException('o caso atingiu o limite de reivindicações pendentes')
      }

      const telefoneNormalizado = TELEFONE.normalizar(dados.pessoa.telefone)
      const chaveTelefone = TELEFONE.chave(telefoneNormalizado)

      const recusadas = await tx.tentativaVerificacao.findMany({
        where: { casoId, veredito: 'recusada' },
        select: { pessoa: { select: { telefone: true } } },
      })
      const vetado = recusadas.some(
        (r) => r.pessoa.telefone && TELEFONE.chave(r.pessoa.telefone) === chaveTelefone,
      )
      if (vetado) {
        throw new ConflictException('Não foi possível registrar a reivindicação neste caso.')
      }

      const pessoa = await tx.pessoa.create({
        data: {
          nome: dados.pessoa.nome,
          telefone: telefoneNormalizado,
        },
      })

      const tentativa = await tx.tentativaVerificacao.create({
        data: {
          casoId,
          pessoaId: pessoa.id,
          veredito: 'pendente',
          codigoAcompanhamento: codigoAcompanhamentoHash,
          referencia: dados.pessoa.referencia ?? null,
          casoProprioId: dados.casoProprio?.id ?? null,
          respostas: {
            create: dados.respostas.map((r) => ({
              perguntaId: r.perguntaId,
              texto: r.texto,
            })),
          },
        },
        select: {
          id: true,
          veredito: true,
        },
      })

      return {
        id: tentativa.id,
        veredito: tentativa.veredito as VereditoVerificacao,
      }
    })
  }

  async listarParaAutor(casoId: string, tipo: TipoCaso): Promise<ReivindicacaoParaAutor[]> {
    const tentativas = await this.prisma.tentativaVerificacao.findMany({
      where: { casoId },
      orderBy: { criadoEm: 'desc' },
      include: {
        pessoa: true,
        respostas: {
          include: { pergunta: true },
          orderBy: { pergunta: { ordem: 'asc' } },
        },
      },
    })

    const chaves = Array.from(
      new Set(
        tentativas
          .map((t) => (t.pessoa.telefone ? TELEFONE.chave(t.pessoa.telefone) : ''))
          .filter((k): k is string => Boolean(k)),
      ),
    )

    const mapaDenuncias = new Map<string, number>()
    if (chaves.length > 0) {
      const resultados = await this.prisma.$queryRaw<{ chave: string; total: number }[]>`
        SELECT
          CONCAT(SUBSTRING(regexp_replace(p.telefone, '[^0-9]', '', 'g'), 1, 2), RIGHT(regexp_replace(p.telefone, '[^0-9]', '', 'g'), 8)) AS chave,
          COUNT(DISTINCT d.tentativa_id)::int AS total
        FROM denuncia d
        JOIN tentativa_verificacao tv ON tv.id = d.tentativa_id
        JOIN pessoa p ON p.id = tv.pessoa_id
        WHERE p.telefone IS NOT NULL
          AND CONCAT(SUBSTRING(regexp_replace(p.telefone, '[^0-9]', '', 'g'), 1, 2), RIGHT(regexp_replace(p.telefone, '[^0-9]', '', 'g'), 8)) IN (${Prisma.join(chaves)})
        GROUP BY 1
      `
      for (const r of resultados) {
        mapaDenuncias.set(r.chave, Number(r.total))
      }
    }

    const itens: ReivindicacaoParaAutor[] = []

    for (const t of tentativas) {
      const chave = t.pessoa.telefone ? TELEFONE.chave(t.pessoa.telefone) : ''
      const denunciasDoTelefone = chave ? (mapaDenuncias.get(chave) ?? 0) : 0

      const contato =
        t.veredito === 'aceita'
          ? {
              nome: t.pessoa.nome,
              telefone: t.pessoa.telefone,
              referencia: tipo === 'perdido' ? t.referencia : null,
            }
          : null

      itens.push({
        id: t.id,
        veredito: t.veredito as VereditoVerificacao,
        criadoEm: t.criadoEm.toISOString(),
        decididoEm: t.decididoEm ? t.decididoEm.toISOString() : null,
        respostas: t.respostas.map((r) => ({
          ordem: r.pergunta.ordem,
          enunciado: r.pergunta.enunciado,
          respostaEsperada: r.pergunta.respostaEsperada,
          respostaDada: r.texto,
        })),
        denunciasDoTelefone,
        contato,
      })
    }

    return itens
  }

  async buscarTentativaParaDecidir(tentativaId: string, casoId: string) {
    return this.prisma.tentativaVerificacao.findFirst({
      where: { id: tentativaId, casoId },
      include: {
        caso: {
          include: {
            autor: {
              select: { id: true, telefone: true },
            },
          },
        },
        casoProprio: {
          select: { id: true, tipo: true, estado: true },
        },
      },
    })
  }

  async gravarVeredito({
    tentativaId,
    casoId,
    veredito,
    novoTelefoneAutor,
    autorJaTinhaTelefone,
    casoProprioId,
    autorId,
  }: GravarVereditoParams): Promise<void> {
    const agora = new Date()

    await this.prisma.$transaction(async (tx) => {
      // Trava em ordem crescente de id para evitar deadlock em aceites concorrentes
      const idsParaTravar = [casoId, casoProprioId].filter((id): id is string => Boolean(id)).sort()
      if (idsParaTravar.length === 1) {
        await tx.$queryRaw`SELECT id FROM caso WHERE id = ${idsParaTravar[0]}::uuid FOR UPDATE`
      } else if (idsParaTravar.length === 2) {
        await tx.$queryRaw`SELECT id FROM caso WHERE id IN (${idsParaTravar[0]}::uuid, ${idsParaTravar[1]}::uuid) ORDER BY id FOR UPDATE`
      }

      if (veredito === 'aceita') {
        const resultadoCaso = await tx.caso.updateMany({
          where: { id: casoId, estado: { in: [...ESTADOS_ABERTOS] } },
          data: { estado: 'em_contato', ...dadosDeRenovacao(agora) },
        })
        if (resultadoCaso.count !== 1) {
          throw new ConflictException('caso não está mais aberto para aceite')
        }

        if (novoTelefoneAutor && autorId && !autorJaTinhaTelefone) {
          await tx.pessoa.update({
            where: { id: autorId },
            data: { telefone: novoTelefoneAutor },
          })
        }

        if (casoProprioId) {
          const resultadoProprio = await tx.caso.updateMany({
            where: { id: casoProprioId, estado: { in: [...ESTADOS_ABERTOS] } },
            // quem decidiu foi o autor deste caso; o relógio do caso próprio é de outro autor
            data: { estado: 'em_contato' },
          })

          if (resultadoProprio.count === 1) {
            await tx.pareamento.updateMany({
              where: {
                OR: [
                  { casoPerdidoId: casoId, casoEncontradoId: casoProprioId },
                  { casoPerdidoId: casoProprioId, casoEncontradoId: casoId },
                ],
              },
              data: {
                veredito: 'confirmado',
                decididoEm: agora,
              },
            })
          }
        }
      } else {
        const resultadoCaso = await tx.caso.updateMany({
          where: { id: casoId, estado: { in: [...ESTADOS_VIGIADOS] } },
          data: dadosDeRenovacao(agora),
        })
        if (resultadoCaso.count !== 1) {
          throw new ConflictException('caso fechado')
        }
      }

      const resultadoTentativa = await tx.tentativaVerificacao.updateMany({
        where: { id: tentativaId, veredito: 'pendente' },
        data: {
          veredito,
          decididoEm: agora,
        },
      })
      if (resultadoTentativa.count !== 1) {
        throw new ConflictException('reivindicação não está mais pendente')
      }
    })
  }

  async buscarPorIdParaReivindicante(id: string) {
    return this.prisma.tentativaVerificacao.findUnique({
      where: { id },
      include: {
        caso: {
          include: {
            autor: {
              select: { nome: true, telefone: true },
            },
            local: {
              select: { referencia: true },
            },
          },
        },
      },
    })
  }

  async marcarContatoVisto(id: string): Promise<void> {
    await this.prisma.tentativaVerificacao.update({
      where: { id },
      data: { contatoVistoEm: new Date() },
    })
  }

  async buscarReivindicacao(id: string) {
    return this.prisma.tentativaVerificacao.findUnique({
      where: { id },
      select: { id: true, casoId: true },
    })
  }

  async criarDenuncia(casoId: string, dados: NovaDenunciaDto): Promise<{ id: string }> {
    if (dados.reivindicacaoId) {
      const existente = await this.prisma.denuncia.findFirst({
        where: {
          tentativaId: dados.reivindicacaoId,
          motivo: dados.motivo,
        },
        select: { id: true },
      })
      if (existente) {
        return existente
      }
    }

    const denuncia = await this.prisma.denuncia.create({
      data: {
        casoId,
        motivo: dados.motivo,
        texto: dados.texto ?? null,
        tentativaId: dados.reivindicacaoId ?? null,
      },
      select: { id: true },
    })
    return denuncia
  }
}
