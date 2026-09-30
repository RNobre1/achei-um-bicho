import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

// sem 0/O e 1/I/L, que se confundem quando a pessoa anota à mão ou dita o código
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const TAMANHO_BLOCO = 4

function bloco(): string {
  let saida = ''
  for (let i = 0; i < TAMANHO_BLOCO; i++) saida += ALFABETO[randomInt(ALFABETO.length)]
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
