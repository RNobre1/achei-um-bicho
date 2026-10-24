import { ConflictException, Injectable } from '@nestjs/common'
import {
  ESTADOS_ABERTOS,
  type PerguntaPublica,
  type ReivindicacaoParaAutor,
  type TipoCaso,
  type VereditoVerificacao,
} from '@achei/contratos'
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
        codigoEdicao: true,
      },
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

  async contarPendentesDoCaso(casoId: string): Promise<number> {
    return this.prisma.tentativaVerificacao.count({
      where: {
        casoId,
        veredito: 'pendente',
      },
    })
  }

  async telefoneFoiRecusadoNoCaso(casoId: string, telefone: string): Promise<boolean> {
    const tentativa = await this.prisma.tentativaVerificacao.findFirst({
      where: {
        casoId,
        veredito: 'recusada',
        pessoa: { telefone },
      },
      select: { id: true },
    })
    return Boolean(tentativa)
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
      const pessoa = await tx.pessoa.create({
        data: {
          nome: dados.pessoa.nome,
          telefone: dados.pessoa.telefone,
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

    const itens: ReivindicacaoParaAutor[] = []

    for (const t of tentativas) {
      const denunciasDoTelefone = await this.prisma.denuncia.count({
        where: {
          tentativa: {
            pessoa: {
              telefone: t.pessoa.telefone,
            },
          },
        },
      })

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
      if (veredito === 'aceita') {
        const resultadoCaso = await tx.caso.updateMany({
          where: { id: casoId, estado: { in: [...ESTADOS_ABERTOS] } },
          data: {
            estado: 'em_contato',
            ultimaInteracaoEm: agora,
            cobradoEm: null,
          },
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
            data: {
              estado: 'em_contato',
              ultimaInteracaoEm: agora,
              cobradoEm: null,
            },
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
          where: { id: casoId, estado: { in: [...ESTADOS_ABERTOS] } },
          data: {
            ultimaInteracaoEm: agora,
            cobradoEm: null,
          },
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
