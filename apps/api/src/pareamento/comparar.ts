import { PAREAMENTO, type Coleira, type Comparacao, type Cor, type Porte } from '@achei/contratos'

/** O que a comparação precisa saber de cada lado do par. */
export interface LadoComparavel {
  porte: Porte
  corDominante: Cor
  coleira: Coleira
  ocorridoEm: Date
}

export interface ResultadoDaComparacao {
  batem: Comparacao[]
  divergem: Comparacao[]
  diasDiferenca: number
}

const DIA_MS = 24 * 60 * 60 * 1000

/**
 * Compara só o que foi declarado (RN6), sempre na mesma ordem: porte, cor,
 * coleira, distância e tempo. A espécie não aparece porque é filtro: par de
 * espécies diferentes nem vira candidato (RN7).
 */
export function compararCasos(perdido: LadoComparavel, encontrado: LadoComparavel, distanciaM: number): ResultadoDaComparacao {
  const batem: Comparacao[] = []
  const divergem: Comparacao[] = []
  const anotar = (comparacao: Comparacao, bate: boolean) => (bate ? batem : divergem).push(comparacao)

  anotar({ atributo: 'porte', perdido: perdido.porte, encontrado: encontrado.porte }, perdido.porte === encontrado.porte)
  anotar(
    { atributo: 'cor', perdido: perdido.corDominante, encontrado: encontrado.corDominante },
    perdido.corDominante === encontrado.corDominante,
  )
  // quem viu de longe e não reparou na coleira não pesa nem a favor nem contra
  if (perdido.coleira !== 'nao_observado' && encontrado.coleira !== 'nao_observado') {
    anotar(
      { atributo: 'coleira', perdido: perdido.coleira, encontrado: encontrado.coleira },
      perdido.coleira === encontrado.coleira,
    )
  }
  anotar({ atributo: 'distancia', metros: distanciaM }, distanciaM <= PAREAMENTO.distanciaQueBateM)

  const diasDiferenca = Math.round((encontrado.ocorridoEm.getTime() - perdido.ocorridoEm.getTime()) / DIA_MS)
  anotar(
    { atributo: 'tempo', dias: diasDiferenca },
    diasDiferenca >= -PAREAMENTO.diasAntesQueAindaBatem && diasDiferenca <= PAREAMENTO.diasDepoisQueBatem,
  )

  return { batem, divergem, diasDiferenca }
}

/** Mais coincidências primeiro; empate, o mais perto. É ordem, não nota: nada disso aparece na tela. */
export function ordemDasPistas(a: { batem: unknown[]; distanciaM: number }, b: { batem: unknown[]; distanciaM: number }): number {
  return b.batem.length - a.batem.length || a.distanciaM - b.distanciaM
}
