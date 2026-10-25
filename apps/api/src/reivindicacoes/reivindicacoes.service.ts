import {
  ESTADOS_ABERTOS,
  REIVINDICACAO,
  transicaoPermitida,
  type EstadoCaso,
  type PerguntaPublica,
  type ReivindicacaoParaAutor,
  type ReivindicacaoRegistrada,
  type SituacaoDaReivindicacao,
  type TipoCaso,
  type VereditoVerificacao,
} from '@achei/contratos'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { conferirCodigoEdicao, gerarCodigoEdicao, hashCodigoEdicao } from '../casos/codigo-edicao'
import type { NovaDenunciaDto } from './dto/nova-denuncia.dto'
import type { NovaReivindicacaoDto } from './dto/nova-reivindicacao.dto'
import type { NovoVereditoDaReivindicacaoDto } from './dto/novo-veredito-da-reivindicacao.dto'
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

    if (dados.casoProprio) {
      const proprio = await this.repositorio.buscarCasoProprio(dados.casoProprio.id)
      if (!proprio) throw new NotFoundException('caso próprio não encontrado')

      if (!conferirCodigoEdicao(dados.casoProprio.codigoEdicao, proprio.codigoEdicao)) {
        throw new ForbiddenException('código de edição do caso próprio não confere')
      }

      if (proprio.tipo === caso.tipo) {
        throw new BadRequestException('o caso próprio precisa ser do tipo oposto (perdido versus encontrado)')
      }

      if (!ESTADOS_ABERTOS.includes(proprio.estado as EstadoCaso)) {
        throw new BadRequestException('não foi possível vincular o caso próprio')
      }

      const pareamento = await this.repositorio.buscarPareamentoEntreCasos(casoId, dados.casoProprio.id)
      if (!pareamento || pareamento.veredito === 'descartado') {
        throw new BadRequestException('não foi possível vincular o caso próprio')
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

  async decidir(
    casoId: string,
    tentativaId: string,
    codigo: string | undefined,
    corpo: NovoVereditoDaReivindicacaoDto,
  ): Promise<{ id: string; veredito: VereditoVerificacao }> {
    await this.conferirAutoria(casoId, codigo)

    const tentativa = await this.repositorio.buscarTentativaParaDecidir(tentativaId, casoId)
    if (!tentativa) {
      throw new NotFoundException('reivindicação não encontrada neste caso')
    }

    if (tentativa.veredito !== 'pendente') {
      throw new ConflictException('reivindicação já foi decidida')
    }

    if (!ESTADOS_ABERTOS.includes(tentativa.caso.estado as EstadoCaso)) {
      throw new ConflictException('caso não está mais aberto')
    }

    if (corpo.veredito === 'aceita') {
      const transicaoOk = transicaoPermitida(
        tentativa.caso.estado as EstadoCaso,
        'em_contato',
        tentativa.caso.tipo as TipoCaso,
      )
      if (!transicaoOk) {
        throw new ConflictException('o caso não pode transicionar para em_contato neste estado')
      }

      if (!tentativa.caso.autor.telefone && !corpo.telefone) {
        throw new UnprocessableEntityException('o autor precisa fornecer um telefone para contato ao aceitar')
      }
    }

    await this.repositorio.gravarVeredito({
      tentativaId,
      casoId,
      veredito: corpo.veredito,
      novoTelefoneAutor: corpo.telefone,
      autorJaTinhaTelefone: Boolean(tentativa.caso.autor.telefone),
      casoProprioId: tentativa.casoProprioId,
      autorId: tentativa.caso.autor.id,
    })

    return { id: tentativaId, veredito: corpo.veredito }
  }

  async consultarSituacao(id: string, codigoAcompanhamento: string | undefined): Promise<SituacaoDaReivindicacao> {
    const tentativa = await this.repositorio.buscarPorIdParaReivindicante(id)
    if (!tentativa) {
      throw new NotFoundException('reivindicação não encontrada')
    }

    if (!conferirCodigoEdicao(codigoAcompanhamento, tentativa.codigoAcompanhamento)) {
      throw new ForbiddenException('código de acompanhamento não confere com esta reivindicação')
    }

    let contato = null

    if (tentativa.veredito === 'aceita') {
      if (!tentativa.contatoVistoEm) {
        await this.repositorio.marcarContatoVisto(id)
      }

      contato = {
        nome: tentativa.caso.autor.nome,
        telefone: tentativa.caso.autor.telefone,
        referencia: tentativa.caso.tipo === 'encontrado' ? tentativa.caso.local.referencia : null,
      }
    }

    return {
      id: tentativa.id,
      veredito: tentativa.veredito as VereditoVerificacao,
      caso: {
        id: tentativa.caso.id,
        tipo: tentativa.caso.tipo as TipoCaso,
        estado: tentativa.caso.estado as EstadoCaso,
      },
      contato,
    }
  }

  async denunciar(casoId: string, dados: NovaDenunciaDto): Promise<{ id: string }> {
    const existe = await this.repositorio.casoExiste(casoId)
    if (!existe) {
      throw new NotFoundException('caso não encontrado')
    }

    if (dados.reivindicacaoId) {
      const tentativa = await this.repositorio.buscarReivindicacao(dados.reivindicacaoId)
      if (!tentativa || tentativa.casoId !== casoId) {
        throw new BadRequestException('reivindicação não pertence a este caso')
      }
    }

    return this.repositorio.criarDenuncia(casoId, dados)
  }
}
