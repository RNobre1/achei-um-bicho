import { MENSAGEM_AVISO_CONTATO } from '@achei/contratos'
import { describe, expect, it } from 'vitest'
import {
  PASSOS,
  converterCastradoParaChip,
  converterChipParaCastrado,
  montarPublicacao,
  momentoDoPeriodo,
  pendenciasDoPasso,
  perguntasSugeridas,
  rascunhoVazio,
  verificarConfirmacaoContato,
  verificarPareceContato,
  type RascunhoPublicacao,
} from './publicacao'

const agora = new Date('2026-09-28T15:00:00-03:00')

function rascunhoCompleto(): RascunhoPublicacao {
  const r = rascunhoVazio('perdido')
  r.animal = { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'com', nome: ' Nego ' }
  r.local = { latitude: -2.4385, longitude: -54.7085, bairro: 'Aparecida', referencia: '' }
  r.quando = { dia: 'ontem', periodo: 'tarde' }
  r.relato = ''
  r.autor = { nome: 'Tutor do Nego', telefone: '(93) 99123-4567' }
  r.perguntas = r.perguntas.map((p, i) => ({ ...p, resposta: `resposta ${i + 1}` }))
  return r
}

describe('publicação em quatro passos', () => {
  it('tem exatamente quatro passos, o limite do critério de aceite', () => {
    expect(PASSOS).toHaveLength(4)
  })

  it('começa com três perguntas sugeridas, diferentes para cada lado do caso', () => {
    const perdido = perguntasSugeridas('perdido')
    const encontrado = perguntasSugeridas('encontrado')
    expect(perdido).toHaveLength(3)
    expect(encontrado).toHaveLength(3)
    expect(perdido).not.toEqual(encontrado)
  })

  it('aponta o que falta no passo de descrever o animal', () => {
    const r = rascunhoVazio('encontrado')
    r.animal.especie = 'gato'
    expect(pendenciasDoPasso(r, 'animal')).toEqual(['Escolha o porte', 'Escolha a cor', 'Diga se tinha coleira'])
  })

  it('exige lugar e momento no passo de onde e quando', () => {
    expect(pendenciasDoPasso(rascunhoVazio('perdido'), 'ondeQuando')).toEqual([
      'Marque onde aconteceu',
      'Diga quando aconteceu',
    ])
  })

  it('exige as três respostas e o nome de quem publica no último passo', () => {
    const r = rascunhoVazio('perdido')
    r.perguntas[0]!.resposta = 'orelha'
    expect(pendenciasDoPasso(r, 'verificacao')).toEqual([
      'Responda a pergunta 2',
      'Responda a pergunta 3',
      'Diga seu nome',
    ])
  })

  it('acusa telefone preenchido que não passa em TELEFONE no passo de verificação', () => {
    const r = rascunhoCompleto()
    r.autor.telefone = '123'
    expect(pendenciasDoPasso(r, 'verificacao')).toContain('Telefone com DDD: 10 ou 11 dígitos')

    r.autor.telefone = '93991234567'
    expect(pendenciasDoPasso(r, 'verificacao')).not.toContain('Telefone com DDD: 10 ou 11 dígitos')

    r.autor.telefone = '(93) 99123-4567'
    expect(pendenciasDoPasso(r, 'verificacao')).not.toContain('Telefone com DDD: 10 ou 11 dígitos')

    r.autor.telefone = ''
    expect(pendenciasDoPasso(r, 'verificacao')).not.toContain('Telefone com DDD: 10 ou 11 dígitos')
  })

  it('não tem pendência nenhuma com o rascunho completo', () => {
    const r = rascunhoCompleto()
    for (const passo of PASSOS) expect(pendenciasDoPasso(r, passo.id)).toEqual([])
  })

  it('monta o corpo da API limpando espaços, campos vazios e o telefone', () => {
    const corpo = montarPublicacao(rascunhoCompleto(), agora)
    expect(corpo).toEqual({
      tipo: 'perdido',
      animal: { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'com', nome: 'Nego' },
      local: { latitude: -2.4385, longitude: -54.7085, bairro: 'Aparecida' },
      autor: { nome: 'Tutor do Nego', telefone: '93991234567' },
      ocorridoEm: new Date('2026-09-27T16:00:00-03:00').toISOString(),
      perguntas: [
        { enunciado: 'Qual sinal ele tem que não aparece na foto?', respostaEsperada: 'resposta 1' },
        { enunciado: 'Que nome ele atende?', respostaEsperada: 'resposta 2' },
        { enunciado: 'O que ele estava usando quando sumiu?', respostaEsperada: 'resposta 3' },
      ],
    })
  })

  it('recusa montar a publicação com pendência', () => {
    expect(() => montarPublicacao(rascunhoVazio('perdido'), agora)).toThrow(/Escolha a espécie/)
  })
})

describe('momento a partir de dia e período', () => {
  it('ontem à noite vira ontem às 20h', () => {
    expect(momentoDoPeriodo({ dia: 'ontem', periodo: 'noite' }, agora)).toBe(
      new Date('2026-09-27T20:00:00-03:00').toISOString(),
    )
  })

  it('nunca cai no futuro: hoje à noite, às 15h, vira agora', () => {
    expect(momentoDoPeriodo({ dia: 'hoje', periodo: 'noite' }, agora)).toBe(agora.toISOString())
  })
})

describe('ajustes da publicação: castrado e aviso de contato', () => {
  it('inclui animal.castrado na publicação apenas quando preenchido', () => {
    const rSim = rascunhoCompleto()
    rSim.animal.castrado = true
    expect(montarPublicacao(rSim, agora).animal.castrado).toBe(true)

    const rNao = rascunhoCompleto()
    rNao.animal.castrado = false
    expect(montarPublicacao(rNao, agora).animal.castrado).toBe(false)

    const rNaoSei = rascunhoCompleto()
    rNaoSei.animal.castrado = undefined
    expect(montarPublicacao(rNaoSei, agora).animal.castrado).toBeUndefined()
  })

  it('converte chip <-> valor de castrado com suporte a Não sei', () => {
    expect(converterChipParaCastrado('sim')).toBe(true)
    expect(converterChipParaCastrado('nao')).toBe(false)
    expect(converterChipParaCastrado('nao_sei')).toBeUndefined()
    expect(converterChipParaCastrado(undefined)).toBeUndefined()

    expect(converterCastradoParaChip(true)).toBe('sim')
    expect(converterCastradoParaChip(false)).toBe('nao')
    expect(converterCastradoParaChip(undefined)).toBeUndefined()
  })

  it('detecta telefone, zap ou link no relato ou em enunciado de pergunta usando mensagem única', () => {
    expect(verificarPareceContato(rascunhoCompleto())).toBeUndefined()

    const rComZap = rascunhoCompleto()
    rComZap.relato = 'Qualquer coisa me chama no zap 93991234567'
    expect(verificarPareceContato(rComZap)).toBe(MENSAGEM_AVISO_CONTATO)

    const rComPergunta = rascunhoCompleto()
    rComPergunta.perguntas[0]!.enunciado = 'Ligar para 93991234567?'
    expect(verificarPareceContato(rComPergunta)).toBe(MENSAGEM_AVISO_CONTATO)
  })

  describe('confirmação em dois toques do aviso de contato', () => {
    it('bloqueia no primeiro toque quando parece conter contato e retorna o aviso', () => {
      const r = rascunhoCompleto()
      r.relato = 'Meu zap é 93991234567'
      const resultado = verificarConfirmacaoContato(r, false)
      expect(resultado.podePublicar).toBe(false)
      expect(resultado.aviso).toBe(MENSAGEM_AVISO_CONTATO)
    })

    it('libera no segundo toque após o usuário já ter visto o aviso e confirmado', () => {
      const r = rascunhoCompleto()
      r.relato = 'Meu zap é 93991234567'
      const resultado = verificarConfirmacaoContato(r, true)
      expect(resultado.podePublicar).toBe(true)
      expect(resultado.aviso).toBeUndefined()
    })

    it('libera de primeira quando não parece conter contato', () => {
      const r = rascunhoCompleto()
      const resultado = verificarConfirmacaoContato(r, false)
      expect(resultado.podePublicar).toBe(true)
      expect(resultado.aviso).toBeUndefined()
    })
  })
})
