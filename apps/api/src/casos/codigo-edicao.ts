import { CODIGO_EDICAO } from '@achei/contratos'
import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

function bloco(): string {
  let saida = ''
  for (let i = 0; i < CODIGO_EDICAO.tamanhoBloco; i++) {
    saida += CODIGO_EDICAO.alfabeto[randomInt(CODIGO_EDICAO.alfabeto.length)]
  }
  return saida
}

/**
 * Código que permite editar e encerrar um caso publicado sem conta. São 31^8
 * combinações (cerca de 850 bilhões), sorteadas com gerador criptográfico.
 */
export function gerarCodigoEdicao(): string {
  return `${bloco()}-${bloco()}`
}

/** O banco guarda só isto. O código em claro sai uma vez, na resposta da publicação. */
export function hashCodigoEdicao(codigo: string): string {
  const normalizado = codigo.trim().toUpperCase().replace(/-/g, '')
  return createHash('sha256').update(normalizado).digest('hex')
}

/**
 * Confere o código que a pessoa digitou contra o hash guardado. A comparação leva
 * sempre o mesmo tempo, para não dar pista de quantos caracteres acertaram.
 */
export function conferirCodigoEdicao(codigo: string | undefined, hash: string | null): boolean {
  if (!codigo?.trim() || !hash) return false
  const digitado = Buffer.from(hashCodigoEdicao(codigo), 'hex')
  const guardado = Buffer.from(hash, 'hex')
  return digitado.length === guardado.length && timingSafeEqual(digitado, guardado)
}
