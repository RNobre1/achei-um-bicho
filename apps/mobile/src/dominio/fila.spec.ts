import type { NovaPublicacao } from '@achei/contratos'
import { describe, expect, it } from 'vitest'
import {
  MAXIMO_TENTATIVAS,
  criarItemFila,
  descreverEstadoItem,
  formatarHorarioFila,
  marcarCasoEnviado,
  marcarEnviando,
  marcarFalhaEnvio,
  marcarFotoEnviada,
  podeTentar,
  proximoPassoEnvio,
  quandoConexaoVolta,
  type ItemFilaEnvio,
} from './fila'

const publicacaoExemplo: NovaPublicacao = {
  tipo: 'perdido',
  animal: { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'com', nome: 'Pipoca' },
  local: { latitude: -2.4385, longitude: -54.7085, bairro: 'Aparecida' },
  autor: { nome: 'Maria', telefone: '93991234567' },
  ocorridoEm: '2026-10-10T14:00:00.000Z',
  perguntas: [
    { enunciado: 'Pergunta 1', respostaEsperada: 'R1' },
    { enunciado: 'Pergunta 2', respostaEsperada: 'R2' },
    { enunciado: 'Pergunta 3', respostaEsperada: 'R3' },
  ],
}

describe('regras da fila de envio de publicações (F9)', () => {
  const agora = new Date('2026-10-10T15:30:00.000Z')

  it('cria item na fila no estado esperando, com etapa caso e tentativas zero', () => {
    const item = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: ['file:///foto1.jpg', 'file:///foto2.jpg'],
      nomeAnimal: 'Pipoca',
      agora,
    })

    expect(item.estado).toBe('esperando')
    expect(item.etapa).toBe('caso')
    expect(item.tentativas).toBe(0)
    expect(item.fotos).toHaveLength(2)
    expect(item.fotos[0]).toEqual({ uri: 'file:///foto1.jpg', estado: 'esperando' })
    expect(item.fotos[1]).toEqual({ uri: 'file:///foto2.jpg', estado: 'esperando' })
  })

  it('ordem de envio: caso antes das fotos', () => {
    const item = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: ['file:///foto1.jpg'],
      nomeAnimal: 'Pipoca',
      agora,
    })

    const primeiroPasso = proximoPassoEnvio(item)
    expect(primeiroPasso).toEqual({ tipo: 'caso', publicacao: { ...publicacaoExemplo, idCliente: 'uuid-1', codigoEdicao: '2345-6789' } })
  })

  it('transita para fotos quando o caso é confirmado pelo servidor', () => {
    const item = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: ['file:///foto1.jpg'],
      nomeAnimal: 'Pipoca',
      agora,
    })

    const comCasoEnviado = marcarCasoEnviado(item, 'caso-123', agora)
    expect(comCasoEnviado.casoId).toBe('caso-123')
    expect(comCasoEnviado.etapa).toBe('fotos')
    expect(comCasoEnviado.estado).toBe('esperando')

    const proximo = proximoPassoEnvio(comCasoEnviado)
    expect(proximo).toEqual({ tipo: 'foto', uri: 'file:///foto1.jpg' })
  })

  it('transita direto para enviado quando o caso não tem fotos', () => {
    const item = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: [],
      nomeAnimal: 'Pipoca',
      agora,
    })

    const comCasoEnviado = marcarCasoEnviado(item, 'caso-123', agora)
    expect(comCasoEnviado.estado).toBe('enviado')
    expect(comCasoEnviado.etapa).toBe('concluido')
    expect(proximoPassoEnvio(comCasoEnviado)).toBeNull()
  })

  it('transita para enviado quando todas as fotos terminam de subir', () => {
    const item = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: ['file:///foto1.jpg', 'file:///foto2.jpg'],
      nomeAnimal: 'Pipoca',
      agora,
    })

    const aposCaso = marcarCasoEnviado(item, 'caso-123', agora)
    const aposFoto1 = marcarFotoEnviada(aposCaso, 'file:///foto1.jpg', agora)
    expect(aposFoto1.estado).toBe('esperando')
    expect(aposFoto1.etapa).toBe('fotos')

    const aposFoto2 = marcarFotoEnviada(aposFoto1, 'file:///foto2.jpg', agora)
    expect(aposFoto2.estado).toBe('enviado')
    expect(aposFoto2.etapa).toBe('concluido')
    expect(proximoPassoEnvio(aposFoto2)).toBeNull()
  })

  it('ao falhar, incrementa tentativas e fica esperando se ainda não atingiu o limite de 5', () => {
    const item = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: [],
      nomeAnimal: 'Pipoca',
      agora,
    })

    const falha1 = marcarFalhaEnvio(item, 'Sem conexão com o servidor', agora)
    expect(falha1.tentativas).toBe(1)
    expect(falha1.estado).toBe('esperando')
    expect(falha1.ultimoErro).toBe('Sem conexão com o servidor')
    expect(podeTentar(falha1)).toBe(true)
  })

  it('ao atingir 5 tentativas, marca o item como falhou', () => {
    let item = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: [],
      nomeAnimal: 'Pipoca',
      agora,
    })

    for (let i = 0; i < MAXIMO_TENTATIVAS; i++) {
      item = marcarFalhaEnvio(item, 'Erro de rede', agora)
    }

    expect(item.tentativas).toBe(5)
    expect(item.estado).toBe('falhou')
    expect(podeTentar(item)).toBe(false)
  })

  it('o que fazer quando a conexão volta: seleciona itens aptos para envio', () => {
    const esperando = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: [],
      nomeAnimal: 'Pipoca',
      agora,
    })

    let esgotado = criarItemFila({
      idCliente: 'uuid-2',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: [],
      nomeAnimal: 'Rex',
      agora,
    })
    for (let i = 0; i < MAXIMO_TENTATIVAS; i++) esgotado = marcarFalhaEnvio(esgotado, 'falha', agora)

    const itens = [esperando, esgotado]
    const prontos = quandoConexaoVolta(itens)

    expect(prontos).toEqual([esperando])
  })

  it('formata o texto e o horário que a tela da fila mostra', () => {
    const itemEsperando = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: [],
      nomeAnimal: 'Pipoca',
      agora,
    })

    expect(descreverEstadoItem(itemEsperando)).toBe('Esperando conexão')
    expect(descreverEstadoItem(marcarEnviando(itemEsperando))).toBe('Enviando caso…')

    const itemEnviado = marcarCasoEnviado(itemEsperando, 'caso-1', agora)
    expect(descreverEstadoItem(itemEnviado)).toBe('Publicado')

    const itemFalhou = marcarFalhaEnvio(itemEsperando, 'Erro no servidor', agora)
    itemFalhou.estado = 'falhou'
    expect(descreverEstadoItem(itemFalhou)).toBe('Erro no servidor')

    expect(formatarHorarioFila('2026-10-10T14:05:00.000Z')).toMatch(/\d{2}:\d{2}/)
  })
})
