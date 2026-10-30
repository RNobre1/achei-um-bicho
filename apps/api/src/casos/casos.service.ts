import {
  ESTADO_INICIAL,
  ESTADOS_ABERTOS,
  ESTADOS_VIGIADOS,
  PARECE_CONTATO,
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
import type { Configuracao } from '../configuracao'
import { CONFIGURACAO } from '../configuracao.module'
import { areaAproximada } from '../geo/area-aproximada'
import { GeradorDePareamentos } from '../pareamento/gerador-de-pareamentos'
import { CasosRepositorio } from './casos.repositorio'
import { conferirCodigoEdicao, gerarCodigoEdicao, hashCodigoEdicao } from './codigo-edicao'
import type { CasoAberto } from './dto/caso-aberto.dto'
import type { ConsultarMuralDto, Mural } from './dto/consultar-mural.dto'
import type { NovoDesfechoDto } from './dto/desfecho.dto'
import type { EdicaoDoCasoDto } from './dto/edicao-do-caso.dto'
import type { CasoPublicado, PublicarCasoDto } from './dto/publicar-caso.dto'

@Injectable()
export class CasosService {
  constructor(
    private readonly repositorio: CasosRepositorio,
    private readonly gerador: GeradorDePareamentos,
    @Inject(CONFIGURACAO) private readonly configuracao: Configuracao,
  ) {}

  async publicar(dados: PublicarCasoDto): Promise<CasoPublicado> {
    const estado = ESTADO_INICIAL[dados.tipo]
    const codigoEdicao = gerarCodigoEdicao()
    const id = await this.repositorio.criar({
      dados,
      estado,
      codigoEdicaoHash: hashCodigoEdicao(codigoEdicao),
    })
    await this.gerador.gerarPara(id)
    return { id, tipo: dados.tipo, estado, codigoEdicao }
  }

  async mural({ latitude, longitude, raio, tipo }: ConsultarMuralDto): Promise<Mural> {
    const centro = { latitude, longitude }
    const raioM = raio ?? this.configuracao.raioPadraoM
    const [casos, totalNoRaioMaximo] = await Promise.all([
      this.repositorio.abertosNoRaio(centro, raioM, tipo),
      this.repositorio.contarAbertosNoRaio(centro, RAIO.maximoM, tipo),
    ])
    return { raioM, casos, totalNoRaioMaximo }
  }

  async abrir(id: string): Promise<CasoAberto> {
    const caso = await this.repositorio.buscarComPonto(id)
    if (!caso) throw new NotFoundException('caso não encontrado')
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
    if (dados.relato && PARECE_CONTATO.test(dados.relato)) {
      throw new BadRequestException('relato não pode conter telefone, WhatsApp ou links (contato mediado)')
    }

    const mudouAtributosDePareamento =
      Boolean(dados.animal?.porte && dados.animal.porte !== caso.animal.porte) ||
      Boolean(dados.animal?.corDominante && dados.animal.corDominante !== caso.animal.corDominante) ||
      Boolean(dados.animal?.coleira && dados.animal.coleira !== caso.animal.coleira)

    const ok = await this.repositorio.editar(id, caso.estado as EstadoCaso, caso.animal.id, dados)
    if (!ok) {
      throw new ConflictException(`caso em estado "${caso.estado}" mudou concorrentemente`)
    }

    if (mudouAtributosDePareamento) {
      await this.gerador.recalcularPara(id)
    }

    return { ok: true }
  }
}
