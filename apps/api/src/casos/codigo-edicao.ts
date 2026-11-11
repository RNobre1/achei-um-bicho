import { gerarCodigoEdicao as gerarCodigoEdicaoContratos } from '@achei/contratos'
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { lerConfiguracao } from '../configuracao'

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
  const segredo = lerConfiguracao().codigoSegredo
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
