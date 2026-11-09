import { gerarCodigoEdicao as gerarCodigoEdicaoContratos } from '@achei/contratos'
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

const SEGREDO_PADRAO_DESENVOLVIMENTO = 'segredo-padrao-desenvolvimento'

function obterSegredo(): string {
  const segredo = process.env.CODIGO_SEGREDO?.trim()
  if (process.env.NODE_ENV === 'production' && !segredo) {
    throw new Error('CODIGO_SEGREDO é obrigatório em produção')
  }
  return segredo || SEGREDO_PADRAO_DESENVOLVIMENTO
}

/**
 * Código que permite editar e encerrar um caso publicado sem conta. São 31^8
 * combinações (cerca de 850 bilhões), sorteadas com gerador criptográfico.
 */
export function gerarCodigoEdicao(): string {
  return gerarCodigoEdicaoContratos(randomInt)
}

/** O banco guarda só isto. O código em claro sai uma vez, na resposta da publicação. */
export function hashCodigoEdicao(codigo: string): string {
  const normalizado = codigo.trim().toUpperCase().replace(/[-\s]/g, '')
  const segredo = obterSegredo()
  return createHmac('sha256', segredo).update(normalizado).digest('hex')
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
