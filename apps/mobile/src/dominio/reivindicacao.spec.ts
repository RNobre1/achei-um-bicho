import { describe, expect, it } from 'vitest'
import {
  formularioReivindicacaoValido,
  limparTelefone,
  pedeReferencia,
  rotuloBotaoReivindicar,
  telefoneValido,
} from './reivindicacao'

describe('regras de domínio da reivindicação', () => {
  it('define o rótulo do botão de reivindicação conforme o tipo de caso', () => {
    expect(rotuloBotaoReivindicar('perdido')).toBe('Acho que achei esse bicho')
    expect(rotuloBotaoReivindicar('encontrado')).toBe('Acho que esse bicho é meu')
  })

  it('só pede referência para quem está com o animal (caso perdido)', () => {
    expect(pedeReferencia('perdido')).toBe(true)
    expect(pedeReferencia('encontrado')).toBe(false)
  })

  it('valida telefone com 10 ou 11 dígitos, ignorando máscara e caracteres não numéricos', () => {
    expect(telefoneValido('(93) 99123-4567')).toBe(true)
    expect(telefoneValido('9335221234')).toBe(true)
    expect(telefoneValido('93991234567')).toBe(true)
    expect(telefoneValido('123')).toBe(false)
    expect(telefoneValido('9399123456789')).toBe(false)
    expect(telefoneValido('')).toBe(false)
  })

  it('limpa caracteres não numéricos do telefone', () => {
    expect(limparTelefone('(93) 99123-4567')).toBe('93991234567')
    expect(limparTelefone('93 3522-1234')).toBe('9335221234')
  })

  it('valida formulário de reivindicação completo no caso perdido (exige referência)', () => {
    const respostas = [
      { perguntaId: 'p1', texto: 'orelha rasgada' },
      { perguntaId: 'p2', texto: 'Nego' },
      { perguntaId: 'p3', texto: 'coleira vermelha' },
    ]

    expect(
      formularioReivindicacaoValido({
        tipoCaso: 'perdido',
        respostas,
        pessoa: { nome: 'Carlos', telefone: '(93) 99123-4567', referencia: 'Rua das Flores 123' },
      }),
    ).toBe(true)

    // Sem referência no caso perdido
    expect(
      formularioReivindicacaoValido({
        tipoCaso: 'perdido',
        respostas,
        pessoa: { nome: 'Carlos', telefone: '(93) 99123-4567', referencia: '' },
      }),
    ).toBe(false)

    // Sem nome
    expect(
      formularioReivindicacaoValido({
        tipoCaso: 'perdido',
        respostas,
        pessoa: { nome: '   ', telefone: '(93) 99123-4567', referencia: 'Rua 1' },
      }),
    ).toBe(false)

    // Resposta em branco
    expect(
      formularioReivindicacaoValido({
        tipoCaso: 'perdido',
        respostas: [
          { perguntaId: 'p1', texto: '' },
          { perguntaId: 'p2', texto: 'Nego' },
          { perguntaId: 'p3', texto: 'coleira' },
        ],
        pessoa: { nome: 'Carlos', telefone: '(93) 99123-4567', referencia: 'Rua 1' },
      }),
    ).toBe(false)
  })

  it('valida formulário de reivindicação no caso encontrado (não exige referência)', () => {
    const respostas = [
      { perguntaId: 'p1', texto: 'orelha rasgada' },
      { perguntaId: 'p2', texto: 'Nego' },
      { perguntaId: 'p3', texto: 'coleira vermelha' },
    ]

    expect(
      formularioReivindicacaoValido({
        tipoCaso: 'encontrado',
        respostas,
        pessoa: { nome: 'Maria', telefone: '93991112233' },
      }),
    ).toBe(true)
  })
})
