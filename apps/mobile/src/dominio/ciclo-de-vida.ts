import {
  ESTADO_CASO,
  ESTADOS_ABERTOS,
  ESTADOS_VIGIADOS,
  TIPO_DESFECHO,
  type EstadoCaso,
  type NovoDesfecho,
  type TipoDesfecho,
} from '@achei/contratos'

export type AcaoCicloDeVida = 'confirmar' | 'editar' | 'reabrir' | 'encerrar'

export interface EstadoComCobranca {
  estado: EstadoCaso
  cobrancaPendente?: boolean
}

/** Retorna quais ações estão disponíveis para quem publicou o caso neste momento. */
export function acoesDisponiveis(situacao: EstadoComCobranca): AcaoCicloDeVida[] {
  const acoes: AcaoCicloDeVida[] = []

  if (situacao.cobrancaPendente && ESTADOS_VIGIADOS.includes(situacao.estado)) {
    acoes.push('confirmar')
  }

  if (ESTADOS_ABERTOS.includes(situacao.estado)) {
    acoes.push('editar')
  }

  if (situacao.estado === 'em_contato') {
    acoes.push('reabrir')
  }

  if (situacao.estado !== 'resolvido') {
    acoes.push('encerrar')
  }

  return acoes
}

/** Formata o texto descritivo da situação do caso para visualização em Meus Casos. */
export function textoDaSituacao(situacao: {
  estado: EstadoCaso
  cobrancaPendente?: boolean
  desfecho?: { tipo: TipoDesfecho } | null
}): string {
  if (situacao.estado === 'resolvido') {
    if (situacao.desfecho?.tipo && TIPO_DESFECHO.entradas[situacao.desfecho.tipo]) {
      return `Resolvido · ${TIPO_DESFECHO.entradas[situacao.desfecho.tipo].rotulo}`
    }
    return 'Resolvido'
  }

  if (situacao.cobrancaPendente) {
    return 'Ainda está procurando?'
  }

  return ESTADO_CASO.entradas[situacao.estado]?.rotulo ?? situacao.estado
}

export type QuandoDesfecho = 'hoje' | 'ontem' | 'outro_dia'

export interface RascunhoDesfecho {
  tipo?: TipoDesfecho
  quando?: QuandoDesfecho
  dataOutroDia?: string
}

/** Calcula a data e hora ISO do desfecho conforme a opção escolhida. */
export function momentoDoDesfecho(
  quando: QuandoDesfecho,
  dataOutroDia?: string,
  agora: Date = new Date(),
): string {
  switch (quando) {
    case 'hoje':
      return agora.toISOString()
    case 'ontem': {
      const ontem = new Date(agora)
      ontem.setDate(agora.getDate() - 1)
      return ontem.toISOString()
    }
    case 'outro_dia': {
      if (dataOutroDia && !isNaN(Date.parse(dataOutroDia))) {
        return new Date(dataOutroDia).toISOString()
      }
      return agora.toISOString()
    }
  }
}

/** Lista o que falta preencher no formulário de encerramento. */
export function pendenciasDoDesfecho(r: RascunhoDesfecho): string[] {
  const falta: string[] = []
  if (!r.tipo) falta.push('Escolha o desfecho do caso')
  if (!r.quando) falta.push('Diga quando o desfecho aconteceu')
  if (r.quando === 'outro_dia' && (!r.dataOutroDia || isNaN(Date.parse(r.dataOutroDia)))) {
    falta.push('Informe uma data válida para o desfecho')
  }
  return falta
}

/** Monta o corpo de NovoDesfecho para envio à API. */
export function montarDesfecho(r: RascunhoDesfecho, agora: Date = new Date()): NovoDesfecho {
  const pendencias = pendenciasDoDesfecho(r)
  if (pendencias.length > 0) throw new Error(pendencias.join('\n'))

  return {
    tipo: r.tipo!,
    ocorridoEm: momentoDoDesfecho(r.quando!, r.dataOutroDia, agora),
  }
}

/** Valida os dados brutos de um desfecho. */
export function validarDesfecho(desfecho: Partial<NovoDesfecho>, agora: Date = new Date()): string[] {
  const erros: string[] = []

  if (!desfecho.tipo) {
    erros.push('Escolha o desfecho do caso')
  } else if (!TIPO_DESFECHO.valores.includes(desfecho.tipo)) {
    erros.push('Desfecho inválido')
  }

  if (!desfecho.ocorridoEm) {
    erros.push('Informe a data do desfecho')
  } else {
    const data = Date.parse(desfecho.ocorridoEm)
    if (isNaN(data)) {
      erros.push('Data do desfecho inválida')
    } else if (new Date(data) > agora) {
      erros.push('Data do desfecho não pode ser no futuro')
    }
  }

  return erros
}
