import { resolve } from 'node:path'
import { PAREAMENTO, RAIO } from '@achei/contratos'

export interface Configuracao {
  porta: number
  origensCors: string[]
  raioPadraoM: number
  /** Onde as fotos ficam no disco. Em contêiner, precisa ser um volume. */
  pastaFotos: string
  /** Teto de distância para um caso virar candidato de outro (RN7). */
  raioMaximoPareamentoM: number
}

type Ambiente = Record<string, string | undefined>

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
  return {
    porta: inteiro(ambiente, 'PORT', 3333),
    origensCors: (ambiente.CORS_ORIGINS ?? 'http://localhost:8081')
      .split(',')
      .map((origem) => origem.trim())
      .filter(Boolean),
    raioPadraoM,
    pastaFotos: resolve(ambiente.PASTA_FOTOS?.trim() || 'fotos'),
    raioMaximoPareamentoM,
  }
}
