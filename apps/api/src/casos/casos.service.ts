import {
  ESTADO_INICIAL,
  ESTADOS_ABERTOS,
  ESTADOS_VIGIADOS,
  RAIO,
  transicaoPermitida,
  type EstadoCaso,
  type SituacaoDoCaso,
  type TipoCaso,
  type TipoDesfecho,
} from '@achei/contratos'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { diaEmSantarem } from '../comum/dia-em-santarem'
import type { Configuracao } from '../configuracao'
import { CONFIGURACAO } from '../configuracao.module'
import { areaAproximada, MARGEM_DO_DESLOCAMENTO_M } from '../geo/area-aproximada'
import { distanciaEmMetros } from '../geo/distancia'
import { GeradorDePareamentos } from '../pareamento/gerador-de-pareamentos'
import { CasosRepositorio } from './casos.repositorio'
import { conferirCodigoEdicao, gerarCodigoEdicao, hashCodigoEdicao } from './codigo-edicao'
import type { CasoAberto } from './dto/caso-aberto.dto'
import type { ConsultarMuralDto, Mural } from './dto/consultar-mural.dto'
import type { NovoDesfechoDto } from './dto/desfecho.dto'
import type { EdicaoDoCasoDto } from './dto/edicao-do-caso.dto'
import type { CasoPublicado, PublicarCasoDto } from './dto/publicar-caso.dto'

/** Quantos casos o mural traz de uma vez; o suficiente para um bairro. */
const LIMITE_MURAL = 50

@Injectable()
export class CasosService {
  constructor(
    private readonly repositorio: CasosRepositorio,
    private readonly gerador: GeradorDePareamentos,
    @Inject(CONFIGURACAO) private readonly configuracao: Configuracao,
  ) {}

  async publicar(dados: PublicarCasoDto): Promise<CasoPublicado> {
    if (dados.idCliente && dados.codigoEdicao) {
      const existente = await this.repositorio.buscarPorIdCliente(dados.idCliente)
      if (existente) {
        if (conferirCodigoEdicao(dados.codigoEdicao, existente.codigoEdicao)) {
          return {
            id: existente.id,
            tipo: existente.tipo,
            estado: existente.estado,
            codigoEdicao: dados.codigoEdicao,
          }
        }
        throw new ConflictException('id de cliente já existe com outro código de edição')
      }
    }

    const estado = ESTADO_INICIAL[dados.tipo]
    const codigoEdicao = dados.codigoEdicao ?? gerarCodigoEdicao()
    let id: string
    try {
      id = await this.repositorio.criar({
        dados,
        estado,
        codigoEdicaoHash: hashCodigoEdicao(codigoEdicao),
      })
    } catch (e) {
      if (
        dados.idCliente &&
        dados.codigoEdicao &&
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const existente = await this.repositorio.buscarPorIdCliente(dados.idCliente)
        if (existente) {
          if (conferirCodigoEdicao(dados.codigoEdicao, existente.codigoEdicao)) {
            return {
              id: existente.id,
              tipo: existente.tipo,
              estado: existente.estado,
              codigoEdicao: dados.codigoEdicao,
            }
          }
          throw new ConflictException('id de cliente já existe com outro código de edição')
        }
      }
      throw e
    }

    await this.gerador.gerarPara(id)
    return { id, tipo: dados.tipo, estado, codigoEdicao }
  }

  async mural({ latitude, longitude, raio, tipo }: ConsultarMuralDto): Promise<Mural> {
    const centro = { latitude, longitude }
    const raioM = raio ?? this.configuracao.raioPadraoM
    // o banco filtra pelo ponto real com a folga do maior deslocamento; entrar no raio,
    // a distância, a ordem e a contagem saem só do centro publicado. Com o ponto real,
    // três consultas de centros diferentes dariam a posição de cada caso (trilateração)
    const candidatos = await this.repositorio.candidatosNoRaio(centro, RAIO.maximoM + MARGEM_DO_DESLOCAMENTO_M, tipo)
    const publicados = candidatos.map((c) => ({
      id: c.id,
      distanciaM: distanciaEmMetros(centro, areaAproximada(c.id, c, c.raioImprecisaoM).centro),
    }))
    const totalNoRaioMaximo = publicados.filter((p) => p.distanciaM <= RAIO.maximoM).length
    const noRaio = publicados
      .filter((p) => p.distanciaM <= raioM)
      .sort((a, b) => a.distanciaM - b.distanciaM)
      .slice(0, LIMITE_MURAL)
    const detalhes = await this.repositorio.detalhesDoMural(noRaio.map((p) => p.id))
    const casos = noRaio.flatMap((p) => {
      const caso = detalhes.get(p.id)
      return caso ? [{ ...caso, distanciaM: Math.round(p.distanciaM) }] : []
    })
    return { raioM, casos, totalNoRaioMaximo }
  }

  async abrir(id: string): Promise<CasoAberto> {
    const caso = await this.repositorio.buscarComPonto(id)
    if (!caso) throw new NotFoundException('caso não encontrado')
    // depois da anonimização o ponto guardado já é o centro publicado; servir de novo
    // aplicaria um segundo deslocamento, e duas leituras dariam o ponto real
    if (caso.foraDoAr) throw new NotFoundException('caso encerrado há mais de 30 dias')
    const fotos = await this.repositorio.fotosDoCaso(id)

    const { centro, raioM } = areaAproximada(
      caso.id,
      { latitude: caso.latitude, longitude: caso.longitude },
      caso.raioImprecisaoM,
    )
    return {
      id: caso.id,
      tipo: caso.tipo,
      estado: caso.estado,
      relato: caso.relato,
      ocorridoEm: caso.ocorridoEm.toISOString(),
      publicadoEm: caso.publicadoEm.toISOString(),
      animal: {
        especie: caso.especie,
        porte: caso.porte,
        corDominante: caso.corDominante,
        coleira: caso.coleira,
        nome: caso.nome,
        castrado: caso.castrado,
      },
      fotos,
      area: { latitude: centro.latitude, longitude: centro.longitude, raioM, bairro: caso.bairro },
    }
  }

  async situacao(id: string, codigoEdicao?: string): Promise<SituacaoDoCaso> {
    const caso = await this.repositorio.buscarParaSituacao(id)
    if (!caso) throw new NotFoundException('caso não encontrado')
    if (!conferirCodigoEdicao(codigoEdicao, caso.codigoEdicao)) {
      throw new ForbiddenException('código de edição não confere com este caso')
    }

    const agora = Date.now()
    const diasSemInteracao = Math.floor((agora - caso.ultimaInteracaoEm.getTime()) / (24 * 60 * 60 * 1000))
    const estaVigiado = ESTADOS_VIGIADOS.includes(caso.estado as EstadoCaso)
    const cobrancaPendente =
      estaVigiado &&
      (Boolean(caso.cobradoEm) || diasSemInteracao >= this.configuracao.diasAteCobranca)

    return {
      id: caso.id,
      estado: caso.estado as EstadoCaso,
      cobrancaPendente,
      diasSemInteracao,
      reivindicacoesPendentes: caso._count.tentativas,
      desfecho: caso.desfecho
        ? {
            tipo: caso.desfecho.tipo as TipoDesfecho,
            ocorridoEm: caso.desfecho.ocorridoEm.toISOString(),
          }
        : null,
    }
  }

  async confirmar(id: string, codigoEdicao?: string): Promise<{ ok: true }> {
    const caso = await this.repositorio.buscarParaSituacao(id)
    if (!caso) throw new NotFoundException('caso não encontrado')
    if (!conferirCodigoEdicao(codigoEdicao, caso.codigoEdicao)) {
      throw new ForbiddenException('código de edição não confere com este caso')
    }
    if (!ESTADOS_VIGIADOS.includes(caso.estado as EstadoCaso)) {
      throw new ConflictException(`caso em estado "${caso.estado}" não aceita confirmação`)
    }
    const ok = await this.repositorio.confirmar(id, caso.estado as EstadoCaso)
    if (!ok) {
      throw new ConflictException(`caso em estado "${caso.estado}" mudou concorrentemente`)
    }
    return { ok: true }
  }

  async reabrir(id: string, codigoEdicao?: string): Promise<{ ok: true }> {
    const caso = await this.repositorio.buscarParaSituacao(id)
    if (!caso) throw new NotFoundException('caso não encontrado')
    if (!conferirCodigoEdicao(codigoEdicao, caso.codigoEdicao)) {
      throw new ForbiddenException('código de edição não confere com este caso')
    }
    if (caso.estado !== 'em_contato') {
      throw new ConflictException(`caso em estado "${caso.estado}" não pode ser reaberto`)
    }
    const novoEstado = ESTADO_INICIAL[caso.tipo as TipoCaso]
    if (!transicaoPermitida(caso.estado as EstadoCaso, novoEstado, caso.tipo as TipoCaso)) {
      throw new ConflictException(`caso em estado "${caso.estado}" não pode transicionar para ${novoEstado}`)
    }
    const ok = await this.repositorio.reabrir(id, caso.estado as EstadoCaso, novoEstado)
    if (!ok) {
      throw new ConflictException(`caso em estado "${caso.estado}" mudou concorrentemente`)
    }
    return { ok: true }
  }

  async encerrar(id: string, dados: NovoDesfechoDto, codigoEdicao?: string): Promise<{ id: string }> {
    const caso = await this.repositorio.buscarParaSituacao(id)
    if (!caso) throw new NotFoundException('caso não encontrado')
    if (!conferirCodigoEdicao(codigoEdicao, caso.codigoEdicao)) {
      throw new ForbiddenException('código de edição não confere com este caso')
    }
    if (!transicaoPermitida(caso.estado as EstadoCaso, 'resolvido', caso.tipo as TipoCaso)) {
      throw new ConflictException(`caso em estado "${caso.estado}" não pode transicionar para resolvido`)
    }
    // um desfecho novo tiraria o caso da condição de fora do ar e serviria de novo a
    // área de um ponto já anonimizado (segundo deslocamento)
    if (await this.repositorio.estaForaDoAr(id)) throw new NotFoundException('caso encerrado há mais de 30 dias')
    // o desfecho sustenta o tempo até o reencontro no artigo; antes do caso, a conta dá negativa
    if (diaEmSantarem(new Date(dados.ocorridoEm)) < diaEmSantarem(caso.ocorridoEm)) {
      throw new BadRequestException('o desfecho não pode ser antes do dia em que o caso aconteceu')
    }
    try {
      return await this.repositorio.encerrarComDesfecho(id, caso.estado as EstadoCaso, dados)
    } catch (e: any) {
      if (e?.code === 'P2002' || e?.message === 'ESTADO_MODIFICADO') {
        throw new ConflictException('caso já encerrado ou modificado concorrentemente')
      }
      throw e
    }
  }

  async editar(id: string, dados: EdicaoDoCasoDto, codigoEdicao?: string): Promise<{ ok: true }> {
    const caso = await this.repositorio.buscarParaEdicao(id)
    if (!caso) throw new NotFoundException('caso não encontrado')
    if (!conferirCodigoEdicao(codigoEdicao, caso.codigoEdicao)) {
      throw new ForbiddenException('código de edição não confere com este caso')
    }
    if (!ESTADOS_ABERTOS.includes(caso.estado as EstadoCaso)) {
      throw new ConflictException(`caso em estado "${caso.estado}" não pode ser editado`)
    }

    const ok = await this.repositorio.editar(id, caso.estado as EstadoCaso, caso.animal.id, dados)
    if (!ok) {
      throw new ConflictException(`caso em estado "${caso.estado}" mudou concorrentemente`)
    }

    await this.gerador.recalcularPara(id)

    return { ok: true }
  }
}
