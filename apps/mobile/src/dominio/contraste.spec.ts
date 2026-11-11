import { describe, expect, it } from 'vitest'
import { comTransparencia, cores } from '../tema'

/**
 * Calcula a luminância relativa de uma cor hexadecimal conforme a recomendação WCAG 2.1.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function luminanciaRelativa(hex: string): number {
  const limpo = hex.replace('#', '')
  const r = parseInt(limpo.slice(0, 2), 16) / 255
  const g = parseInt(limpo.slice(2, 4), 16) / 255
  const b = parseInt(limpo.slice(4, 6), 16) / 255

  const linear = [r, g, b].map((canal) =>
    canal <= 0.04045 ? canal / 12.92 : Math.pow((canal + 0.055) / 1.055, 2.4),
  )

  const [lr = 0, lg = 0, lb = 0] = linear
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

/**
 * Razão de contraste entre duas cores (L1 + 0.05) / (L2 + 0.05), onde L1 é a mais clara.
 * O critério de sucesso WCAG 1.4.3 (nível AA) exige no mínimo 4,5:1 para texto normal.
 */
export function razaoDeContraste(cor1: string, cor2: string): number {
  const l1 = luminanciaRelativa(cor1)
  const l2 = luminanciaRelativa(cor2)
  const clara = Math.max(l1, l2)
  const escura = Math.min(l1, l2)
  return (clara + 0.05) / (escura + 0.05)
}

describe('RNF5 · contraste WCAG 2.1 nível AA para pares de texto e fundo', () => {
  const LIMITE_AA_TEXTO_NORMAL = 4.5

  const paresUsados: { texto: string; fundo: string; descricao: string }[] = [
    { texto: cores.texto, fundo: cores.chuva, descricao: 'texto principal sobre fundo chuva' },
    { texto: cores.texto, fundo: cores.branco, descricao: 'texto principal sobre cartão/campo branco' },
    { texto: cores.tapajos, fundo: cores.chuva, descricao: 'títulos tapajós sobre fundo chuva' },
    { texto: cores.tapajos, fundo: cores.branco, descricao: 'títulos/código tapajós sobre fundo branco' },
    { texto: cores.tapajos, fundo: cores.alter, descricao: 'texto do botão acento (tapajós sobre alter)' },
    { texto: cores.branco, fundo: cores.tapajos, descricao: 'texto branco sobre botão escuro/filtro ativo' },
    { texto: cores.apagado, fundo: cores.chuva, descricao: 'texto secundário apagado sobre fundo chuva' },
    { texto: cores.apagado, fundo: cores.branco, descricao: 'texto secundário apagado sobre fundo branco' },
    { texto: cores.branco, fundo: cores.perdi, descricao: 'etiqueta branco sobre cor perdi ("sumiu")' },
    { texto: cores.branco, fundo: cores.achei, descricao: 'etiqueta branco sobre cor achei ("achado")' },
    { texto: cores.perdi, fundo: cores.chuva, descricao: 'destaque perdi sobre fundo chuva (mural/pistas)' },
    { texto: cores.perdi, fundo: cores.branco, descricao: 'destaque perdi sobre fundo branco (perguntas)' },
    { texto: '#C9D6D8', fundo: cores.tapajos, descricao: 'rótulo de pistas sobre fundo próprio tapajós' },
  ]

  it.each(paresUsados)('garante contraste AA (>= 4.5:1) para $descricao', ({ texto, fundo }) => {
    const contraste = razaoDeContraste(texto, fundo)
    expect(contraste).toBeGreaterThanOrEqual(LIMITE_AA_TEXTO_NORMAL)
  })

  it('comTransparencia deriva cor rgba válida a partir das cores hexadecimais do tema', () => {
    expect(comTransparencia(cores.perdi, 0.16)).toBe('rgba(35, 121, 123, 0.16)')
  })
})
