import { Inject, Injectable } from '@nestjs/common'
import type { Configuracao } from '../configuracao'
import { CONFIGURACAO } from '../configuracao.module'
import { compararCasos } from './comparar'
import { PareamentoRepositorio, type NovoPar } from './pareamento.repositorio'

/**
 * Ao publicar um caso, procura candidatos do outro lado e grava cada par com o que
 * bateu e o que não bateu. Não decide nada: quem decide é quem publicou (D3).
 */
@Injectable()
export class GeradorDePareamentos {
  constructor(
    private readonly repositorio: PareamentoRepositorio,
    @Inject(CONFIGURACAO) private readonly configuracao: Configuracao,
  ) {}

  async gerarPara(casoId: string): Promise<number> {
    const caso = await this.repositorio.caso(casoId)
    if (!caso) return 0
    const candidatos = await this.repositorio.candidatos(casoId, this.configuracao.raioMaximoPareamentoM)

    const pares = candidatos.map((candidato): NovoPar => {
      const [perdido, encontrado] = caso.tipo === 'perdido' ? [caso, candidato] : [candidato, caso]
      return {
        casoPerdidoId: perdido.id,
        casoEncontradoId: encontrado.id,
        distanciaM: candidato.distanciaM,
        ...compararCasos(perdido, encontrado, candidato.distanciaM),
      }
    })
    await this.repositorio.gravar(pares)
    return pares.length
  }
}
