import { PAREAMENTO, RAIO } from '@achei/contratos'

export interface Configuracao {
  porta: number
  origensCors: string[]
  raioPadraoM: number
  /** Teto de distância para um caso virar candidato de outro (RN7). */
  raioMaximoPareamentoM: number
  /** Dias sem interação até marcar para cobrança. */
  diasAteCobranca: number
  /** Dias sem interação até expirar e sair do mural. */
  diasAteExpirar: number
  /** Chave que autoriza a execução da tarefa diária de ciclo de vida. */
  tarefasChave?: string
  /** Segredo para geração de HMAC dos códigos de edição. */
  codigoSegredo: string
  /** Limite de requisições GET por IP por minuto. */
  limiteLeituraPorMinuto: number
  /** Limite de requisições de escrita (POST, PATCH, DELETE) por IP por minuto. */
  limiteEscritaPorMinuto: number
  /** Limite de requisições GET para fotos por IP por minuto. */
  limiteFotosPorMinuto: number
  /** Quantidade de saltos de proxy confiáveis (X-Forwarded-For). */
  saltosDeProxy: number
}

type Ambiente = Record<string, string | undefined>

export const SEGREDO_PADRAO_DESENVOLVIMENTO = 'segredo-local-desenvolvimento'

function inteiro(ambiente: Ambiente, nome: string, padrao: number): number {
  const bruto = ambiente[nome]
  if (bruto === undefined || bruto.trim() === '') return padrao
  const valor = Number(bruto)
  if (!Number.isInteger(valor)) {
    throw new Error(`${nome} precisa ser um número inteiro; veio "${bruto}"`)
  }
  return valor
}

/** Lê e valida a configuração. Falha na subida, não no meio de uma requisição. */
export function lerConfiguracao(ambiente: Ambiente = process.env): Configuracao {
  const raioPadraoM = inteiro(ambiente, 'RAIO_PADRAO_METROS', RAIO.padraoM)
  if (raioPadraoM < RAIO.minimoM || raioPadraoM > RAIO.maximoM) {
    throw new Error(
      `RAIO_PADRAO_METROS precisa ficar entre ${RAIO.minimoM} e ${RAIO.maximoM}; veio ${raioPadraoM}`,
    )
  }
  const raioMaximoPareamentoM = inteiro(ambiente, 'RAIO_MAXIMO_PAREAMENTO_METROS', PAREAMENTO.raioMaximoM)
  if (raioMaximoPareamentoM < RAIO.minimoM || raioMaximoPareamentoM > RAIO.maximoM) {
    throw new Error(
      `RAIO_MAXIMO_PAREAMENTO_METROS precisa ficar entre ${RAIO.minimoM} e ${RAIO.maximoM}; veio ${raioMaximoPareamentoM}`,
    )
  }
  const diasAteCobranca = inteiro(ambiente, 'DIAS_ATE_COBRANCA', 9)
  const diasAteExpirar = inteiro(ambiente, 'DIAS_ATE_EXPIRAR', 15)
  if (diasAteCobranca <= 0) {
    throw new Error(`DIAS_ATE_COBRANCA precisa ser maior que zero; veio ${diasAteCobranca}`)
  }
  if (diasAteExpirar <= diasAteCobranca) {
    throw new Error(
      `DIAS_ATE_EXPIRAR precisa ser maior que DIAS_ATE_COBRANCA (${diasAteCobranca}); veio ${diasAteExpirar}`,
    )
  }
  const tarefasChaveBruta = ambiente.TAREFAS_CHAVE?.trim()
  const tarefasChave = tarefasChaveBruta ? tarefasChaveBruta : undefined

  const saltosDeProxy = inteiro(ambiente, 'SALTOS_DE_PROXY', 1)
  if (saltosDeProxy < 0) {
    throw new Error(`SALTOS_DE_PROXY precisa ser maior ou igual a zero; veio ${saltosDeProxy}`)
  }

  const codigoSegredo = ambiente.CODIGO_SEGREDO?.trim()
  if (ambiente.NODE_ENV === 'production' && !codigoSegredo) {
    throw new Error('CODIGO_SEGREDO é obrigatório em produção')
  }

  return {
    porta: inteiro(ambiente, 'PORT', 3333),
    origensCors: (ambiente.CORS_ORIGINS ?? 'http://localhost:8081')
      .split(',')
      .map((origem) => origem.trim())
      .filter(Boolean),
    raioPadraoM,
    raioMaximoPareamentoM,
    diasAteCobranca,
    diasAteExpirar,
    tarefasChave,
    codigoSegredo: codigoSegredo || SEGREDO_PADRAO_DESENVOLVIMENTO,
    limiteLeituraPorMinuto: inteiro(ambiente, 'LIMITE_LEITURA_POR_MINUTO', 600),
    limiteEscritaPorMinuto: inteiro(ambiente, 'LIMITE_ESCRITA_POR_MINUTO', 60),
    limiteFotosPorMinuto: inteiro(ambiente, 'LIMITE_FOTOS_POR_MINUTO', 1200),
    saltosDeProxy,
  }
}
