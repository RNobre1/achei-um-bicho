import type { NovaPublicacao } from '@achei/contratos'
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
})
