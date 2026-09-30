import { FOTO } from '@achei/contratos'

/**
 * Tamanho para o qual a foto é reduzida antes de subir. O lado maior vai para a
 * largura máxima: foto em pé de celular reduzida só pela largura ainda passaria
 * de 1 MB.
 */
export function dimensoesReduzidas(largura: number, altura: number): { largura: number; altura: number } {
  const maior = Math.max(largura, altura)
  if (maior <= FOTO.larguraMaximaPx) return { largura, altura }
  const escala = FOTO.larguraMaximaPx / maior
  return { largura: Math.round(largura * escala), altura: Math.round(altura * escala) }
}

export function podeAcrescentarFoto(fotos: readonly string[]): boolean {
  return fotos.length < FOTO.maximoPorCaso
}
