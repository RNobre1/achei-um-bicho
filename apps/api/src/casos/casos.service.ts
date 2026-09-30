import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ESTADO_INICIAL, RAIO } from '@achei/contratos'
import type { Configuracao } from '../configuracao'
import { CONFIGURACAO } from '../configuracao.module'
import { areaAproximada } from '../geo/area-aproximada'
import { CasosRepositorio } from './casos.repositorio'
import { gerarCodigoEdicao, hashCodigoEdicao } from './codigo-edicao'
import type { CasoAberto } from './dto/caso-aberto.dto'
import type { ConsultarMuralDto, Mural } from './dto/consultar-mural.dto'
import type { CasoPublicado, PublicarCasoDto } from './dto/publicar-caso.dto'

@Injectable()
export class CasosService {
  constructor(
    private readonly repositorio: CasosRepositorio,
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
}
