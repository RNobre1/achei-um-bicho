import { COR, ESPECIE, PORTE, type CasoAberto, type Coleira, type TipoCaso } from '@achei/contratos'

const DIAS_DA_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const doisDigitos = (n: number) => String(n).padStart(2, '0')

function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/**
 * "Sábado, 22/08, por volta das 17h". A hora é aproximada de propósito: quem
 * publica raramente sabe o minuto, e precisão falsa atrapalha mais que ajuda.
 * Datas montadas à mão pelo mesmo motivo de formatarDistancia: Intl varia no Hermes.
 */
export function descreverQuando(iso: string, agora: Date = new Date()): string {
  const quando = new Date(iso)
  const ontem = new Date(agora)
  ontem.setDate(agora.getDate() - 1)

  const dia = mesmoDia(quando, agora)
    ? 'Hoje'
    : mesmoDia(quando, ontem)
      ? 'Ontem'
      : `${DIAS_DA_SEMANA[quando.getDay()]}, ${doisDigitos(quando.getDate())}/${doisDigitos(quando.getMonth() + 1)}`
  return `${dia}, por volta das ${quando.getHours()}h`
}

export function fraseDoLocal(bairro: string | null): string {
  const onde = bairro ? `No bairro ${bairro}` : 'Dentro do círculo marcado'
  return `${onde}. O endereço exato não é publicado.`
}

export const TITULO_DO_LOCAL: Record<TipoCaso, string> = {
  perdido: 'Onde foi visto por último',
  encontrado: 'Onde foi achado',
}

// debaixo do rótulo "Coleira" o texto do vocabulário ("Com coleira") repetiria a
// palavra; as chaves continuam as do vocabulário, e o Record cobra o valor novo
const COLEIRA_NA_FICHA: Record<Coleira, string> = {
  com: 'Tem',
  sem: 'Não tem',
  nao_observado: 'Não deu para ver',
}

export interface Atributo {
  rotulo: string
  valor: string
}

export function atributosDoCaso(animal: CasoAberto['animal']): Atributo[] {
  const atributos: Atributo[] = [
    { rotulo: 'Bicho', valor: ESPECIE.entradas[animal.especie].rotulo },
    { rotulo: 'Porte', valor: PORTE.entradas[animal.porte].rotulo },
    { rotulo: 'Cor', valor: COR.entradas[animal.corDominante].rotulo },
    { rotulo: 'Coleira', valor: COLEIRA_NA_FICHA[animal.coleira] },
  ]
  if (animal.castrado !== null) atributos.push({ rotulo: 'Castrado', valor: animal.castrado ? 'Sim' : 'Não' })
  return atributos
}
