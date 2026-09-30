import { FOTO } from '@achei/contratos'
import { describe, expect, it } from 'vitest'
import { dimensoesReduzidas, podeAcrescentarFoto } from './foto'

describe('foto antes de enviar', () => {
  it('reduz foto de câmera para a largura máxima, mantendo a proporção', () => {
    expect(dimensoesReduzidas(4032, 3024)).toEqual({ largura: FOTO.larguraMaximaPx, altura: 810 })
  })

  it('em foto em pé, reduz pelo lado maior para não sobrar altura enorme', () => {
    expect(dimensoesReduzidas(3024, 4032)).toEqual({ largura: 810, altura: FOTO.larguraMaximaPx })
  })

  it('não amplia foto que já é pequena', () => {
    expect(dimensoesReduzidas(640, 480)).toEqual({ largura: 640, altura: 480 })
  })

  it(`aceita até ${FOTO.maximoPorCaso} fotos por caso`, () => {
    expect(podeAcrescentarFoto([])).toBe(true)
    expect(podeAcrescentarFoto(Array(FOTO.maximoPorCaso - 1).fill('x'))).toBe(true)
    expect(podeAcrescentarFoto(Array(FOTO.maximoPorCaso).fill('x'))).toBe(false)
  })
})
