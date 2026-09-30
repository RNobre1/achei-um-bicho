import type { AvistamentoParaAutor, NovoAvistamento, TipoCaso } from '@achei/contratos'
import { formatarDistancia } from './formatar'
import type { Coordenada } from './posicao'

export type QuandoViu = 'agora' | 'hoje_mais_cedo' | 'ontem'

export interface RascunhoAvistamento {
  ponto?: Coordenada
  quando?: QuandoViu
  bairro: string
  observacao: string
}

const HORA = 60 * 60 * 1000
const HORAS_ANTES_HOJE = 3
/** Ontem à tarde: quem avisa de um dia para o outro raramente lembra a hora. */
const HORA_DE_ONTEM = 16

export function momentoDoAvistamento(quando: QuandoViu, agora: Date = new Date()): string {
  switch (quando) {
    case 'agora':
      return agora.toISOString()
    case 'hoje_mais_cedo': {
      const inicioDoDia = new Date(agora)
      inicioDoDia.setHours(0, 0, 0, 0)
      const antes = new Date(agora.getTime() - HORAS_ANTES_HOJE * HORA)
      return (antes < inicioDoDia ? inicioDoDia : antes).toISOString()
    }
    case 'ontem': {
      const ontem = new Date(agora)
      ontem.setDate(agora.getDate() - 1)
      ontem.setHours(HORA_DE_ONTEM, 0, 0, 0)
      return ontem.toISOString()
    }
  }
}

export function pendenciasDoAvistamento(r: RascunhoAvistamento): string[] {
  const falta: string[] = []
  if (!r.ponto) falta.push('Marque onde você viu')
  if (!r.quando) falta.push('Diga quando você viu')
  return falta
}

export function montarAvistamento(r: RascunhoAvistamento, agora: Date = new Date()): NovoAvistamento {
  const pendencias = pendenciasDoAvistamento(r)
  if (pendencias.length > 0) throw new Error(pendencias.join('\n'))
  const bairro = r.bairro.trim()
  const observacao = r.observacao.trim()
  return {
    latitude: r.ponto!.latitude,
    longitude: r.ponto!.longitude,
    ...(bairro && { bairro }),
    vistoEm: momentoDoAvistamento(r.quando!, agora),
    ...(observacao && { observacao }),
  }
}

const REFERENCIA: Record<TipoCaso, string> = { perdido: 'de onde ele sumiu', encontrado: 'de onde foi achado' }

export function descreverOndeFoiVisto(
  aviso: Pick<AvistamentoParaAutor, 'bairro' | 'distanciaM'>,
  tipo: TipoCaso,
): string {
  return `${aviso.bairro ?? 'Bairro não informado'} · a ${formatarDistancia(aviso.distanciaM)} ${REFERENCIA[tipo]}`
}
