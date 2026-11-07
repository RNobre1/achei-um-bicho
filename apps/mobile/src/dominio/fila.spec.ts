import type { NovaPublicacao } from '@achei/contratos'
import { describe, expect, it } from 'vitest'
import {
  MAXIMO_TENTATIVAS,
  TEMPOS_ESPERA_MS,
  criarItemFila,
  descreverEstadoItem,
  formatarHorarioFila,
  marcarCasoEnviado,
  marcarEnviando,
  marcarFalhaEnvio,
  marcarFotoEnviada,
  marcarFotoFalhaPermanente,
  podeTentar,
  podarItemEnviado,
  proximoPassoEnvio,
  quandoConexaoVolta,
  recuperarItensPresosEmEnviando,
  reiniciarItemFalho,
  resultadoDaPublicacao,
  temItensPendentes,
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

  it('ao falhar com erro passageiro, incrementa tentativas e define espera crescente', () => {
    let item = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: [],
      nomeAnimal: 'Pipoca',
      agora,
    })

    // 1ª falha: 30s
    item = marcarFalhaEnvio(item, { status: 0, mensagem: 'Sem conexão' }, agora)
    expect(item.tentativas).toBe(1)
    expect(item.estado).toBe('esperando')
    expect(item.proximaTentativaEm).toBe(new Date(agora.getTime() + 30_000).toISOString())

    // 2ª falha: 60s
    item = marcarFalhaEnvio(item, { status: 503, mensagem: 'Serviço indisponível' }, agora)
    expect(item.tentativas).toBe(2)
    expect(item.estado).toBe('esperando')
    expect(item.proximaTentativaEm).toBe(new Date(agora.getTime() + 60_000).toISOString())

    // 3ª falha: 120s
    item = marcarFalhaEnvio(item, { status: 429, mensagem: 'Muitas requisições' }, agora)
    expect(item.tentativas).toBe(3)
    expect(item.proximaTentativaEm).toBe(new Date(agora.getTime() + 120_000).toISOString())

    // 4ª falha: 240s
    item = marcarFalhaEnvio(item, { status: 500, mensagem: 'Erro interno' }, agora)
    expect(item.tentativas).toBe(4)
    expect(item.proximaTentativaEm).toBe(new Date(agora.getTime() + 240_000).toISOString())

    // 5ª falha: esgota -> vai a falhou
    item = marcarFalhaEnvio(item, { status: 0, mensagem: 'Sem conexão' }, agora)
    expect(item.tentativas).toBe(5)
    expect(item.estado).toBe('falhou')
    expect(item.proximaTentativaEm).toBeUndefined()
  })

  it('ao falhar com erro permanente (400, 404, 409, 422), vai direto a falhou guardando a mensagem', () => {
    const item = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: [],
      nomeAnimal: 'Pipoca',
      agora,
    })

    const falhaPermanente = marcarFalhaEnvio(
      item,
      { status: 409, mensagem: 'Código de edição já utilizado em outro caso' },
      agora,
    )
    expect(falhaPermanente.estado).toBe('falhou')
    expect(falhaPermanente.ultimoErro).toBe('Código de edição já utilizado em outro caso')
    expect(falhaPermanente.proximaTentativaEm).toBeUndefined()
  })

  it('recupera itens presos em enviando voltando-os para esperando', () => {
    const item1 = marcarEnviando(
      criarItemFila({
        idCliente: 'uuid-1',
        codigoEdicao: '2345-6789',
        publicacao: publicacaoExemplo,
        fotos: [],
        nomeAnimal: 'Pipoca',
        agora,
      }),
    )
    const item2 = criarItemFila({
      idCliente: 'uuid-2',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: [],
      nomeAnimal: 'Rex',
      agora,
    })

    expect(item1.estado).toBe('enviando')
    const recuperados = recuperarItensPresosEmEnviando([item1, item2])
    expect(recuperados[0]!.estado).toBe('esperando')
    expect(recuperados[1]!.estado).toBe('esperando')
  })

  it('podeTentar respeita o tempo de espera proximaTentativaEm', () => {
    let item = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: [],
      nomeAnimal: 'Pipoca',
      agora,
    })

    expect(podeTentar(item, agora)).toBe(true)

    // Falha e agenda para +30s
    item = marcarFalhaEnvio(item, { status: 0, mensagem: 'sem rede' }, agora)
    // No mesmo momento da falha: ainda não passou o tempo
    expect(podeTentar(item, agora)).toBe(false)

    // 15s depois: ainda não
    const apos15s = new Date(agora.getTime() + 15_000)
    expect(podeTentar(item, apos15s)).toBe(false)

    // 31s depois: liberado para tentar
    const apos31s = new Date(agora.getTime() + 31_000)
    expect(podeTentar(item, apos31s)).toBe(true)
  })

  it('reiniciarItemFalho zera tentativas e espera e põe em esperando', () => {
    const item = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: [],
      nomeAnimal: 'Pipoca',
      agora,
    })
    const falho = marcarFalhaEnvio(item, { status: 400, mensagem: 'Erro de validação' }, agora)
    expect(falho.estado).toBe('falhou')

    const reiniciado = reiniciarItemFalho(falho, agora)
    expect(reiniciado.estado).toBe('esperando')
    expect(reiniciado.tentativas).toBe(0)
    expect(reiniciado.proximaTentativaEm).toBeUndefined()
    expect(reiniciado.ultimoErro).toBeUndefined()
  })

  it('resultadoDaPublicacao devolve publicado, guardado ou recusado com precisão', () => {
    const item = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: ['foto1.jpg', 'foto2.jpg'],
      nomeAnimal: 'Pipoca',
      agora,
    })

    // Item recém-criado em esperando -> guardado
    const rGuardado = resultadoDaPublicacao(item)
    expect(rGuardado).toEqual({
      tipo: 'guardado',
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      fotosPendentes: 2,
    })

    // Item com casoId -> publicado
    const comCaso = marcarCasoEnviado(item, 'caso-456', agora)
    const rPublicado = resultadoDaPublicacao(comCaso)
    expect(rPublicado).toEqual({
      tipo: 'publicado',
      casoId: 'caso-456',
      codigoEdicao: '2345-6789',
      fotosPendentes: 2,
    })

    // Item que falhou definitivamente -> recusado
    const falho = marcarFalhaEnvio(item, { status: 422, mensagem: 'Dados inconsistentes' }, agora)
    const rRecusado = resultadoDaPublicacao(falho)
    expect(rRecusado).toEqual({
      tipo: 'recusado',
      mensagem: 'Dados inconsistentes',
    })
  })

  it('quando foto falha com erro permanente, marca como não enviada e não trava o item', () => {
    const item = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: ['file:///foto1.jpg'],
      nomeAnimal: 'Pipoca',
      agora,
    })

    const comCaso = marcarCasoEnviado(item, 'caso-123', agora)
    const comFotoFalha = marcarFotoFalhaPermanente(comCaso, 'file:///foto1.jpg', 'Foto corrompida', agora)

    expect(comFotoFalha.fotos[0]!.estado).toBe('falhou')
    // Como a foto era a única e terminou em falha permanente, o item conclui sem travar a fila
    expect(comFotoFalha.estado).toBe('enviado')
    expect(comFotoFalha.etapa).toBe('concluido')
  })

  it('poda item enviado removendo dados confidenciais e URIs', () => {
    const item = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: ['file:///foto1.jpg'],
      nomeAnimal: 'Pipoca',
      agora,
    })
    const enviado = marcarCasoEnviado(item, 'caso-999', agora)
    enviado.estado = 'enviado'

    const podado = podarItemEnviado(enviado)
    expect(podado.casoId).toBe('caso-999')
    expect(podado.nomeAnimal).toBe('Pipoca')
    expect(podado.estado).toBe('enviado')
    expect(podado.publicacao).toBeUndefined()
    expect(podado.fotos).toEqual([])
  })

  it('identifica se existem itens pendentes na fila', () => {
    const pendente = criarItemFila({
      idCliente: 'uuid-1',
      codigoEdicao: '2345-6789',
      publicacao: publicacaoExemplo,
      fotos: [],
      nomeAnimal: 'Pipoca',
      agora,
    })
    expect(temItensPendentes([pendente])).toBe(true)

    const enviado = { ...pendente, estado: 'enviado' as const }
    expect(temItensPendentes([enviado])).toBe(false)
    expect(temItensPendentes([])).toBe(false)
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

    const itemFalhou = marcarFalhaEnvio(itemEsperando, { status: 500, mensagem: 'Erro no servidor' }, agora)
    itemFalhou.estado = 'falhou'
    expect(descreverEstadoItem(itemFalhou)).toBe('Erro no servidor')

    const dataLocal = new Date(2026, 9, 10, 14, 5)
    expect(formatarHorarioFila(dataLocal.toISOString())).toBe('14:05')
  })
})
