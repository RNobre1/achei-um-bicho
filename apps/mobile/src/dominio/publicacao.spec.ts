import { describe, expect, it } from 'vitest'
import {
  PASSOS,
  momentoDoPeriodo,
  montarPublicacao,
  pendenciasDoPasso,
  perguntasSugeridas,
  rascunhoVazio,
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
