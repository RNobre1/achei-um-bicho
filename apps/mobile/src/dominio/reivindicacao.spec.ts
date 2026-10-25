import { VEREDITO_VERIFICACAO } from '@achei/contratos'
import { describe, expect, it } from 'vitest'
import {
  erroExigeTelefoneDoAutor,
  formularioReivindicacaoValido,
  limparTelefone,
  montarPedidoReivindicacao,
  pedeReferencia,
  podeDecidirReivindicacao,
  ROTULOS_VEREDITO_LISTA,
  ROTULOS_VEREDITO_SITUACAO,
  rotuloBotaoReivindicar,
  rotuloCurtoReivindicacao,
  telefoneValido,
} from './reivindicacao'

describe('regras de domínio da reivindicação', () => {
  it('define o rótulo do botão de reivindicação conforme o tipo de caso', () => {
    expect(rotuloBotaoReivindicar('perdido')).toBe('Acho que achei esse bicho')
    expect(rotuloBotaoReivindicar('encontrado')).toBe('Acho que esse bicho é meu')
  })

  it('define o rótulo curto de reivindicação para Meus casos conforme o tipo', () => {
    expect(rotuloCurtoReivindicacao('perdido')).toBe('Acho que achei')
    expect(rotuloCurtoReivindicacao('encontrado')).toBe('Acho que é meu')
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

  it('monta o pedido de reivindicação com e sem caso próprio', () => {
    const respostas = [{ perguntaId: 'p1', texto: '  orelha cortada  ' }]

    // Sem caso próprio
    const pedidoSimples = montarPedidoReivindicacao({
      respostas,
      nome: '  Carlos  ',
      telefone: '(93) 99123-4567',
      tipoCaso: 'perdido',
      referencia: '  Rua 1  ',
    })
    expect(pedidoSimples).toEqual({
      respostas: [{ perguntaId: 'p1', texto: 'orelha cortada' }],
      pessoa: { nome: 'Carlos', telefone: '93991234567', referencia: 'Rua 1' },
    })

    // Com caso próprio
    const pedidoComProprio = montarPedidoReivindicacao({
      respostas,
      nome: 'Carlos',
      telefone: '93991234567',
      tipoCaso: 'encontrado',
      casoProprio: { id: 'c1', codigoEdicao: 'ABCD-1234' },
    })
    expect(pedidoComProprio).toEqual({
      respostas: [{ perguntaId: 'p1', texto: 'orelha cortada' }],
      pessoa: { nome: 'Carlos', telefone: '93991234567' },
      casoProprio: { id: 'c1', codigoEdicao: 'ABCD-1234' },
    })
  })

  it('permite decidir apenas reivindicação pendente em caso aberto', () => {
    expect(podeDecidirReivindicacao('pendente', 'procurando')).toBe(true)
    expect(podeDecidirReivindicacao('pendente', 'em_contato')).toBe(false)
    expect(podeDecidirReivindicacao('pendente', 'resolvido')).toBe(false)
    expect(podeDecidirReivindicacao('pendente', 'expirado')).toBe(false)
    expect(podeDecidirReivindicacao('aceita', 'procurando')).toBe(false)
    expect(podeDecidirReivindicacao('recusada', 'procurando')).toBe(false)
  })

  it('identifica que erro 422 exige telefone do autor para contato', () => {
    expect(erroExigeTelefoneDoAutor(422)).toBe(true)
    expect(erroExigeTelefoneDoAutor(400)).toBe(false)
    expect(erroExigeTelefoneDoAutor(409)).toBe(false)
  })

  it('possui rótulos de veredito para cada canal percorrendo todos os vereditos de verificação', () => {
    for (const v of VEREDITO_VERIFICACAO.valores) {
      expect(ROTULOS_VEREDITO_SITUACAO[v]).toBeDefined()
      expect(typeof ROTULOS_VEREDITO_SITUACAO[v]).toBe('string')
      expect(ROTULOS_VEREDITO_LISTA[v]).toBeDefined()
      expect(typeof ROTULOS_VEREDITO_LISTA[v]).toBe('string')
    }
  })
})
