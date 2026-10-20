import {
  ESTADOS_ABERTOS,
  REIVINDICACAO,
  type EstadoCaso,
  type PerguntaPublica,
  type ReivindicacaoParaAutor,
  type ReivindicacaoRegistrada,
  type TipoCaso,
} from '@achei/contratos'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { conferirCodigoEdicao, gerarCodigoEdicao, hashCodigoEdicao } from '../casos/codigo-edicao'
import type { NovaReivindicacaoDto } from './dto/nova-reivindicacao.dto'
import { ReivindicacoesRepositorio } from './reivindicacoes.repositorio'

@Injectable()
export class ReivindicacoesService {
  constructor(private readonly repositorio: ReivindicacoesRepositorio) {}

  private async conferirAutoria(casoId: string, codigo: string | undefined) {
    const caso = await this.repositorio.buscarCasoComAutoria(casoId)
    if (!caso) throw new NotFoundException('caso não encontrado')
    if (!conferirCodigoEdicao(codigo, caso.codigoEdicao)) {
      throw new ForbiddenException('código de edição não confere com este caso')
    }
    return caso
  }

  async listarPerguntas(casoId: string): Promise<PerguntaPublica[]> {
    const perguntas = await this.repositorio.perguntasDoCaso(casoId)
    if (!perguntas) throw new NotFoundException('caso não encontrado')
    return perguntas
  }

  async reivindicar(casoId: string, dados: NovaReivindicacaoDto): Promise<ReivindicacaoRegistrada> {
    const caso = await this.repositorio.buscarCasoParaReivindicar(casoId)
    if (!caso) throw new NotFoundException('caso não encontrado')

    if (!ESTADOS_ABERTOS.includes(caso.estado as EstadoCaso)) {
      throw new ConflictException('só casos abertos aceitam novas reivindicações')
    }

    const idsPerguntasDoCaso = new Set(caso.perguntas.map((p) => p.id))
    const idsPerguntasRecebidas = new Set(dados.respostas.map((r) => r.perguntaId))

    if (
      dados.respostas.length !== caso.perguntas.length ||
      idsPerguntasRecebidas.size !== caso.perguntas.length ||
      [...idsPerguntasRecebidas].some((id) => !idsPerguntasDoCaso.has(id))
    ) {
      throw new BadRequestException('é necessária exatamente uma resposta para cada pergunta do caso')
    }

    const totalPendentes = await this.repositorio.contarPendentesDoCaso(casoId)
    if (totalPendentes >= REIVINDICACAO.maximoPendentesPorCaso) {
      throw new ConflictException('o caso atingiu o limite de reivindicações pendentes')
    }

    const jaRecusado = await this.repositorio.telefoneFoiRecusadoNoCaso(casoId, dados.pessoa.telefone)
    if (jaRecusado) {
      throw new ConflictException('este telefone já teve uma reivindicação recusada neste caso')
    }

    if (dados.casoProprio) {
      const proprio = await this.repositorio.buscarCasoProprio(dados.casoProprio.id)
      if (!proprio) throw new NotFoundException('caso próprio não encontrado')

      if (!conferirCodigoEdicao(dados.casoProprio.codigoEdicao, proprio.codigoEdicao)) {
        throw new ForbiddenException('código de edição do caso próprio não confere')
      }

      if (proprio.tipo === caso.tipo) {
        throw new BadRequestException('o caso próprio precisa ser do tipo oposto (perdido versus encontrado)')
      }
    }

    const codigoAcompanhamento = gerarCodigoEdicao()
    const codigoAcompanhamentoHash = hashCodigoEdicao(codigoAcompanhamento)

    const criada = await this.repositorio.criarReivindicacao({
      casoId,
      dados,
      codigoAcompanhamentoHash,
    })

    return {
      id: criada.id,
      veredito: criada.veredito,
      codigoAcompanhamento,
    }
  }

  async listarParaAutor(casoId: string, codigo: string | undefined): Promise<ReivindicacaoParaAutor[]> {
    const caso = await this.conferirAutoria(casoId, codigo)
    return this.repositorio.listarParaAutor(casoId, caso.tipo as TipoCaso)
  }
}
