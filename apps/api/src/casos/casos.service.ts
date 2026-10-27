import {
  ESTADO_INICIAL,
  ESTADOS_VIGIADOS,
  RAIO,
  type EstadoCaso,
  type SituacaoDoCaso,
  type TipoDesfecho,
} from '@achei/contratos'
import {
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
    const cobrancaPendente =
      Boolean(caso.cobradoEm) ||
      (ESTADOS_VIGIADOS.includes(caso.estado as EstadoCaso) && diasSemInteracao >= this.configuracao.diasAteCobranca)

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
    await this.repositorio.confirmar(id)
    return { ok: true }
  }
}
