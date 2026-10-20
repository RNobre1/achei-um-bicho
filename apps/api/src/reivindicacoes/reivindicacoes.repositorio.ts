import { Injectable } from '@nestjs/common'
import type { PerguntaPublica, ReivindicacaoParaAutor, TipoCaso, VereditoVerificacao } from '@achei/contratos'
import { PrismaService } from '../prisma/prisma.service'
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
}
