import type {
  EdicaoDoCaso,
  NovaDenuncia,
  NovaPublicacao,
  NovaReivindicacao,
  NovoDesfecho,
  SituacaoDoCaso,
} from '@achei/contratos'
import { describe, expect, it, vi } from 'vitest'
import { criarClienteApi, ErroApi } from './api'

function respostaJson(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('cliente da API', () => {
  it('pede o mural com as coordenadas e só os filtros informados', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson({ raioM: 1600, casos: [], totalNoRaioMaximo: 0 }))
    const api = criarClienteApi('http://api.teste/', buscar)

    const mural = await api.mural({ latitude: -2.4385, longitude: -54.7085, tipo: 'perdido' })

    expect(mural.raioM).toBe(1600)
    const url = new URL(buscar.mock.calls[0]![0] as string)
    expect(url.origin + url.pathname).toBe('http://api.teste/casos')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: '-2.4385',
      longitude: '-54.7085',
      tipo: 'perdido',
    })
  })

  it('abre um caso pelo id', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson({ id: 'abc' }))
    await criarClienteApi('http://api.teste', buscar).abrirCaso('abc')
    expect(buscar.mock.calls[0]![0]).toBe('http://api.teste/casos/abc')
  })

  it('publica enviando JSON por POST e devolve o código de edição', async () => {
    const buscar = vi.fn().mockResolvedValue(
      respostaJson({ id: 'x', tipo: 'encontrado', estado: 'abrigado_temporariamente', codigoEdicao: 'ABCD-EFGH' }, 201),
    )
    const corpo = { tipo: 'encontrado' } as NovaPublicacao

    const publicado = await criarClienteApi('http://api.teste', buscar).publicar(corpo)

    expect(publicado.codigoEdicao).toBe('ABCD-EFGH')
    const [, opcoes] = buscar.mock.calls[0]!
    expect(opcoes).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } })
    expect(JSON.parse((opcoes as RequestInit).body as string)).toEqual(corpo)
  })

  it('transforma erro de validação da API em mensagem legível', async () => {
    const buscar = vi.fn().mockResolvedValue(
      respostaJson({ message: ['perguntas must contain at least 3 elements'], statusCode: 400 }, 400),
    )
    const erro = await criarClienteApi('http://api.teste', buscar).abrirCaso('x').catch((e) => e)

    expect(erro).toBeInstanceOf(ErroApi)
    expect(erro).toMatchObject({ status: 400, message: 'perguntas must contain at least 3 elements' })
  })

  it('avisa quando o caso não existe mais', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson({ message: 'caso não encontrado' }, 404))
    await expect(criarClienteApi('http://api.teste', buscar).abrirCaso('x')).rejects.toMatchObject({
      status: 404,
      message: 'caso não encontrado',
    })
  })

  it('diz que está sem conexão quando a rede falha, em vez de estourar erro técnico', async () => {
    const buscar = vi.fn().mockRejectedValue(new TypeError('Network request failed'))
    await expect(criarClienteApi('http://api.teste', buscar).abrirCaso('x')).rejects.toMatchObject({
      status: 0,
      message: 'Sem conexão com o servidor. Confira a internet e tente de novo.',
    })
  })

  it('registra avistamento por POST no caso, sem pedir identificação', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson({ id: 'av1', vistoEm: '2026-09-30T12:00:00.000Z' }, 201))
    const aviso = { latitude: -2.44, longitude: -54.71, vistoEm: '2026-09-30T12:00:00.000Z' }

    await criarClienteApi('http://api.teste', buscar).registrarAvistamento('abc', aviso)

    const [url, opcoes] = buscar.mock.calls[0]!
    expect(url).toBe('http://api.teste/casos/abc/avistamentos')
    expect(opcoes).toMatchObject({ method: 'POST' })
    expect(JSON.parse((opcoes as RequestInit).body as string)).toEqual(aviso)
  })

  it('lê os avistamentos do próprio caso mostrando o código de edição no cabeçalho', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson([]))

    await criarClienteApi('http://api.teste', buscar).avistamentosDoMeuCaso('abc', 'ABCD-EFGH')

    const [url, opcoes] = buscar.mock.calls[0]!
    expect(url).toBe('http://api.teste/casos/abc/avistamentos')
    expect((opcoes as RequestInit).headers).toEqual({ 'x-codigo-edicao': 'ABCD-EFGH' })
  })

  it('envia a foto em multipart, com o código de edição, sem fixar Content-Type', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson({ id: 'f1', caminho: '/fotos/f1.jpg' }, 201))
    const arquivo = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' })

    const foto = await criarClienteApi('http://api.teste', buscar).enviarFoto('abc', 'ABCD-EFGH', arquivo)

    expect(foto.caminho).toBe('/fotos/f1.jpg')
    const [url, opcoes] = buscar.mock.calls[0]!
    expect(url).toBe('http://api.teste/casos/abc/fotos')
    const { method, headers, body } = opcoes as RequestInit
    expect(method).toBe('POST')
    // o fetch monta o boundary do multipart; fixar o cabeçalho quebraria o envio
    expect(headers).toEqual({ 'x-codigo-edicao': 'ABCD-EFGH' })
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('foto')).toBeInstanceOf(Blob)
  })

  it('monta o endereço completo da foto a partir do caminho que a API devolve', () => {
    const api = criarClienteApi('http://192.168.0.10:3333/', vi.fn())
    expect(api.urlDaFoto('/fotos/f1.jpg')).toBe('http://192.168.0.10:3333/fotos/f1.jpg')
  })

  it('lê as pistas do próprio caso com o código de edição', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson([]))
    await criarClienteApi('http://api.teste', buscar).pistasDoMeuCaso('abc', 'ABCD-EFGH')
    const [url, opcoes] = buscar.mock.calls[0]!
    expect(url).toBe('http://api.teste/casos/abc/pistas')
    expect((opcoes as RequestInit).headers).toEqual({ 'x-codigo-edicao': 'ABCD-EFGH' })
  })

  it('descarta uma pista com "Não é"', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson({ id: 'p1', veredito: 'descartado' }))
    await criarClienteApi('http://api.teste', buscar).descartarPista('abc', 'p1', 'ABCD-EFGH')
    const [url, opcoes] = buscar.mock.calls[0]!
    expect(url).toBe('http://api.teste/casos/abc/pistas/p1/veredito')
    const { method, headers, body } = opcoes as RequestInit
    expect(method).toBe('POST')
    expect(headers).toEqual({ 'Content-Type': 'application/json', 'x-codigo-edicao': 'ABCD-EFGH' })
    expect(JSON.parse(body as string)).toEqual({ veredito: 'descartado' })
  })

  it('busca as perguntas públicas do caso', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson([{ id: 'p1', ordem: 1, enunciado: 'Qual a cor?' }]))
    const res = await criarClienteApi('http://api.teste', buscar).perguntas('abc')
    expect(res).toEqual([{ id: 'p1', ordem: 1, enunciado: 'Qual a cor?' }])
    expect(buscar.mock.calls[0]![0]).toBe('http://api.teste/casos/abc/perguntas')
  })

  it('reivindica respondendo às perguntas e devolvendo o código de acompanhamento', async () => {
    const resposta = { id: 'r1', veredito: 'pendente', codigoAcompanhamento: 'ABCD-EFGH' }
    const buscar = vi.fn().mockResolvedValue(respostaJson(resposta, 201))
    const dados: NovaReivindicacao = {
      respostas: [{ perguntaId: 'p1', texto: 'Caramelo' }],
      pessoa: { nome: 'Maria', telefone: '93991112233' },
    }

    const res = await criarClienteApi('http://api.teste', buscar).reivindicar('abc', dados)

    expect(res).toEqual(resposta)
    const [url, opcoes] = buscar.mock.calls[0]!
    expect(url).toBe('http://api.teste/casos/abc/reivindicacoes')
    expect(opcoes).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } })
    expect(JSON.parse((opcoes as RequestInit).body as string)).toEqual(dados)
  })

  it('lê as reivindicações do caso para o autor com x-codigo-edicao', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson([]))
    const res = await criarClienteApi('http://api.teste', buscar).reivindicacoesDoMeuCaso('abc', 'ABCD-EFGH')
    expect(res).toEqual([])
    const [url, opcoes] = buscar.mock.calls[0]!
    expect(url).toBe('http://api.teste/casos/abc/reivindicacoes')
    expect((opcoes as RequestInit).headers).toEqual({ 'x-codigo-edicao': 'ABCD-EFGH' })
  })

  it('decide reivindicação com aceite ou recusa e telefone opcional', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson({ id: 'r1', veredito: 'aceita' }))
    const res = await criarClienteApi('http://api.teste', buscar).decidirReivindicacao(
      'abc',
      'r1',
      'ABCD-EFGH',
      'aceita',
      '93991234567',
    )

    expect(res).toEqual({ id: 'r1', veredito: 'aceita' })
    const [url, opcoes] = buscar.mock.calls[0]!
    expect(url).toBe('http://api.teste/casos/abc/reivindicacoes/r1/veredito')
    expect(opcoes).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-codigo-edicao': 'ABCD-EFGH' },
    })
    expect(JSON.parse((opcoes as RequestInit).body as string)).toEqual({
      veredito: 'aceita',
      telefone: '93991234567',
    })
  })

  it('consulta a situação da reivindicação com x-codigo-acompanhamento', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson({ id: 'r1', veredito: 'pendente' }))
    const res = await criarClienteApi('http://api.teste', buscar).situacaoDaReivindicacao('r1', 'ACOM-1234')
    expect(res).toEqual({ id: 'r1', veredito: 'pendente' })
    const [url, opcoes] = buscar.mock.calls[0]!
    expect(url).toBe('http://api.teste/reivindicacoes/r1')
    expect((opcoes as RequestInit).headers).toEqual({ 'x-codigo-acompanhamento': 'ACOM-1234' })
  })

  it('registra denúncia por POST em /casos/:id/denuncias', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson({ id: 'd1' }, 201))
    const denuncia: NovaDenuncia = { motivo: 'pediu_dinheiro', texto: 'Golpe' }
    const res = await criarClienteApi('http://api.teste', buscar).denunciar('abc', denuncia)
    expect(res).toEqual({ id: 'd1' })
    const [url, opcoes] = buscar.mock.calls[0]!
    expect(url).toBe('http://api.teste/casos/abc/denuncias')
    expect(opcoes).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(JSON.parse((opcoes as RequestInit).body as string)).toEqual(denuncia)
  })

  it('consulta a situação do próprio caso com o código de edição', async () => {
    const situacao: SituacaoDoCaso = {
      id: 'abc',
      estado: 'procurando',
      cobrancaPendente: true,
      diasSemInteracao: 10,
      reivindicacoesPendentes: 0,
      desfecho: null,
    }
    const buscar = vi.fn().mockResolvedValue(respostaJson(situacao))
    const resultado = await (criarClienteApi('http://api.teste', buscar) as any).situacaoDoCaso('abc', 'ABCD-EFGH')
    expect(resultado).toEqual(situacao)
    const [url, opcoes] = buscar.mock.calls[0]!
    expect(url).toBe('http://api.teste/casos/abc/situacao')
    expect((opcoes as RequestInit).headers).toEqual({ 'x-codigo-edicao': 'ABCD-EFGH' })
  })

  it('confirma caso vigiado com o código de edição', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson({ ok: true }))
    await (criarClienteApi('http://api.teste', buscar) as any).confirmarCaso('abc', 'ABCD-EFGH')
    const [url, opcoes] = buscar.mock.calls[0]!
    expect(url).toBe('http://api.teste/casos/abc/confirmacao')
    expect((opcoes as RequestInit).method).toBe('POST')
    expect((opcoes as RequestInit).headers).toEqual({ 'x-codigo-edicao': 'ABCD-EFGH' })
  })

  it('reabre caso em_contato com o código de edição', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson({ ok: true }))
    await (criarClienteApi('http://api.teste', buscar) as any).reabrirCaso('abc', 'ABCD-EFGH')
    const [url, opcoes] = buscar.mock.calls[0]!
    expect(url).toBe('http://api.teste/casos/abc/reabertura')
    expect((opcoes as RequestInit).method).toBe('POST')
    expect((opcoes as RequestInit).headers).toEqual({ 'x-codigo-edicao': 'ABCD-EFGH' })
  })

  it('encerra caso enviando desfecho e código de edição', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson({ id: 'abc' }))
    const desfecho: NovoDesfecho = { tipo: 'voltou_para_casa', ocorridoEm: '2026-10-01T12:00:00.000Z' }
    await (criarClienteApi('http://api.teste', buscar) as any).encerrarCaso('abc', 'ABCD-EFGH', desfecho)
    const [url, opcoes] = buscar.mock.calls[0]!
    expect(url).toBe('http://api.teste/casos/abc/desfecho')
    const { method, headers, body } = opcoes as RequestInit
    expect(method).toBe('POST')
    expect(headers).toEqual({ 'Content-Type': 'application/json', 'x-codigo-edicao': 'ABCD-EFGH' })
    expect(JSON.parse(body as string)).toEqual(desfecho)
  })

  it('edita dados do caso com o código de edição', async () => {
    const buscar = vi.fn().mockResolvedValue(respostaJson({ ok: true }))
    const edicao: EdicaoDoCaso = { relato: 'Novo relato', animal: { corDominante: 'preto' } }
    await (criarClienteApi('http://api.teste', buscar) as any).editarCaso('abc', 'ABCD-EFGH', edicao)
    const [url, opcoes] = buscar.mock.calls[0]!
    expect(url).toBe('http://api.teste/casos/abc')
    const { method, headers, body } = opcoes as RequestInit
    expect(method).toBe('PATCH')
    expect(headers).toEqual({ 'Content-Type': 'application/json', 'x-codigo-edicao': 'ABCD-EFGH' })
    expect(JSON.parse(body as string)).toEqual(edicao)
  })

  it("estoura tempo limite de 60 s com AbortController e vira erro passageiro status 0", async () => {
    const buscar = vi.fn().mockImplementation(() => {
      const erro = new Error("The operation was aborted")
      erro.name = "AbortError"
      return Promise.reject(erro)
    })

    await expect(criarClienteApi("http://api.teste", buscar).abrirCaso("x")).rejects.toMatchObject({
      status: 0,
      message: "Sem conexão com o servidor. Confira a internet e tente de novo.",
    })
    expect(buscar.mock.calls[0]![1]?.signal).toBeInstanceOf(AbortSignal)
  })
})
