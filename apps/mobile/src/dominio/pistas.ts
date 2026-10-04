import { COR, PORTE, type Coleira, type Comparacao, type Pista, type TipoCaso } from '@achei/contratos'
import { formatarDistancia } from './formatar'

/** Uma linha da pista: o trecho em negrito e o resto da frase. */
export interface LinhaDaPista {
  bate: boolean
  destaque: string
  resto: string
}

const minusculo = (texto: string) => texto.toLowerCase()
const dias = (n: number) => (Math.abs(n) === 1 ? '1 dia' : `${Math.abs(n)} dias`)

// como a coleira de cada lado entra na frase "o seu ..., esse ..."
const COLEIRA_NA_FRASE: Record<Coleira, string> = {
  com: 'tinha',
  sem: 'estava sem',
  nao_observado: 'não deu para ver',
}

function frase(c: Comparacao, bate: boolean, meuTipo: TipoCaso): Omit<LinhaDaPista, 'bate'> {
  // "o seu" é o lado de quem está olhando; "esse" é o caso do outro lado
  const meu = <T>(perdido: T, encontrado: T) => (meuTipo === 'perdido' ? perdido : encontrado)
  const outro = <T>(perdido: T, encontrado: T) => (meuTipo === 'perdido' ? encontrado : perdido)

  switch (c.atributo) {
    case 'porte':
      return bate
        ? { destaque: 'Mesmo porte', resto: ` — ${minusculo(PORTE.entradas[c.perdido].rotulo)}` }
        : { destaque: '', resto: `Porte diferente — esse é ${minusculo(PORTE.entradas[outro(c.perdido, c.encontrado)].rotulo)}` }
    case 'cor':
      return bate
        ? { destaque: 'Mesma cor', resto: ` — ${minusculo(COR.entradas[c.perdido].rotulo)}` }
        : { destaque: '', resto: `Cor diferente — esse é ${minusculo(COR.entradas[outro(c.perdido, c.encontrado)].rotulo)}` }
    case 'coleira':
      return bate
        ? { destaque: c.perdido === 'com' ? 'Os dois com coleira' : 'Os dois sem coleira', resto: '' }
        : {
            destaque: '',
            resto: `Coleira não confere — o seu ${COLEIRA_NA_FRASE[meu(c.perdido, c.encontrado)]}, esse ${COLEIRA_NA_FRASE[outro(c.perdido, c.encontrado)]}`,
          }
    case 'distancia':
      return bate
        ? { destaque: formatarDistancia(c.metros), resto: ' de onde ele sumiu' }
        : { destaque: '', resto: `${formatarDistancia(c.metros)} de distância` }
    case 'tempo': {
      const quando = c.dias === 0 ? 'No mesmo dia' : c.dias > 0 ? `${dias(c.dias)} depois` : `${dias(c.dias)} antes`
      const referencia = c.dias < 0 ? ' do sumiço informado' : ' do sumiço'
      return bate
        ? { destaque: quando, resto: referencia }
        : { destaque: '', resto: `Achado ${minusculo(quando)}${referencia}` }
    }
  }
}

/** O que bateu primeiro, depois o que não bateu, cada um na ordem em que a API compara. */
export function linhasDaPista(pista: Pista, meuTipo: TipoCaso): LinhaDaPista[] {
  return [
    ...pista.batem.map((c) => ({ bate: true, ...frase(c, true, meuTipo) })),
    ...pista.divergem.map((c) => ({ bate: false, ...frase(c, false, meuTipo) })),
  ]
}

/** O amarelo de destaque vai só para o par em que mais coisa bate do que diverge. */
export function pareceForte(pista: Pick<Pista, 'batem' | 'divergem'>): boolean {
  return pista.batem.length > pista.divergem.length
}

export function resumoDasPistas(quantidade: number): string {
  const inicio = quantidade === 1 ? 'Um caso bate' : `${quantidade} casos batem`
  return `${inicio} com o que você publicou. Quem decide é você — o aplicativo só aproxima.`
}

const QUEM_PODE_SER: Record<TipoCaso, (n: number) => string> = {
  perdido: (n) => (n === 1 ? ' pode ser ele' : ' podem ser ele'),
  encontrado: () => ' de quem perdeu bate com ele',
}

/** As linhas de cada caso em "Meus casos": avisos de quem viu e pistas. */
export function resumoDoMeuCaso(tipo: TipoCaso, avisos: number, pistas: number): { destaque: string; resto: string }[] {
  const linhas: { destaque: string; resto: string }[] = []
  if (avisos > 0) {
    linhas.push(
      avisos === 1
        ? { destaque: '1 pessoa', resto: ' disse ter visto' }
        : { destaque: `${avisos} pessoas`, resto: ' disseram ter visto' },
    )
  }
  if (pistas > 0) {
    linhas.push({ destaque: pistas === 1 ? '1 caso' : `${pistas} casos`, resto: QUEM_PODE_SER[tipo](pistas) })
  }
  return linhas
}
