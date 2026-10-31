import {
  ESTADO_CASO,
  ESTADOS_ABERTOS,
  ESTADOS_VIGIADOS,
  TIPO_DESFECHO,
  type Coleira,
  type Cor,
  type EdicaoDoCaso,
  type EstadoCaso,
  type NovoDesfecho,
  type Porte,
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

  if (situacao.cobrancaPendente && ESTADOS_VIGIADOS.includes(situacao.estado)) {
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

/**
 * Analisa explicitamente datas no formato DD/MM/AAAA ou AAAA-MM-DD.
 * Rejeita qualquer outro formato.
 */
export function parsearDataDesfecho(texto: string): Date | null {
  const limpo = texto.trim()

  // 1. DD/MM/AAAA (ex: 11/10/2026 -> 11 de outubro)
  const matchBr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(limpo)
  if (matchBr) {
    const dia = parseInt(matchBr[1]!, 10)
    const mes = parseInt(matchBr[2]!, 10)
    const ano = parseInt(matchBr[3]!, 10)
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
    const data = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0))
    if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
      return null
    }
    return data
  }

  // 2. AAAA-MM-DD (ex: 2026-10-11)
  const matchIso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(limpo)
  if (matchIso) {
    const ano = parseInt(matchIso[1]!, 10)
    const mes = parseInt(matchIso[2]!, 10)
    const dia = parseInt(matchIso[3]!, 10)
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
    const data = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0))
    if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
      return null
    }
    return data
  }

  return null
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
      if (dataOutroDia) {
        const parsed = parsearDataDesfecho(dataOutroDia)
        if (parsed) return parsed.toISOString()
      }
      return agora.toISOString()
    }
  }
}

/** Lista o que falta preencher no formulário de encerramento. */
export function pendenciasDoDesfecho(r: RascunhoDesfecho, agora: Date = new Date()): string[] {
  const falta: string[] = []
  if (!r.tipo) falta.push('Escolha o desfecho do caso')
  if (!r.quando) falta.push('Diga quando o desfecho aconteceu')
  if (r.quando === 'outro_dia') {
    if (!r.dataOutroDia) {
      falta.push('Informe uma data válida para o desfecho (DD/MM/AAAA ou AAAA-MM-DD)')
    } else {
      const data = parsearDataDesfecho(r.dataOutroDia)
      if (!data) {
        falta.push('Informe uma data válida para o desfecho (DD/MM/AAAA ou AAAA-MM-DD)')
      } else if (data > agora) {
        falta.push('Data do desfecho não pode ser no futuro')
      }
    }
  }
  return falta
}

/** Monta o corpo de NovoDesfecho para envio à API. */
export function montarDesfecho(r: RascunhoDesfecho, agora: Date = new Date()): NovoDesfecho {
  const pendencias = pendenciasDoDesfecho(r, agora)
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

export type OpcaoCastrado = 'sim' | 'nao' | 'nao_informado'

/**
 * Opções de castrado para edição.
 * Se o caso já possui valor (true/false), remove a opção 'Não informado'
 * pois a edição não permite reverter para null.
 */
export function opcoesCastradoEdicao(
  castradoOriginal: boolean | null | undefined,
): readonly { valor: OpcaoCastrado; rotulo: string }[] {
  if (castradoOriginal === true || castradoOriginal === false) {
    return [
      { valor: 'sim', rotulo: 'Sim' },
      { valor: 'nao', rotulo: 'Não' },
    ]
  }
  return [
    { valor: 'sim', rotulo: 'Sim' },
    { valor: 'nao', rotulo: 'Não' },
    { valor: 'nao_informado', rotulo: 'Não informado' },
  ]
}

/** Prepara o payload de edição de caso, preservando strings vazias para limpeza no banco. */
export function prepararEdicao(dados: {
  relato: string
  nome: string
  porte?: Porte
  corDominante?: Cor
  coleira?: Coleira
  castrado?: OpcaoCastrado
}): EdicaoDoCaso {
  const castradoBooleano =
    dados.castrado === 'sim' ? true : dados.castrado === 'nao' ? false : undefined

  return {
    relato: dados.relato.trim(),
    animal: {
      porte: dados.porte,
      corDominante: dados.corDominante,
      coleira: dados.coleira,
      nome: dados.nome.trim(),
      castrado: castradoBooleano,
    },
  }
}
