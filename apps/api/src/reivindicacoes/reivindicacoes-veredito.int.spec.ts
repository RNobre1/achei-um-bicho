import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'
import { aoSul, CENTRO_SANTAREM } from '../../test/pontos'

describe('POST /casos/:id/reivindicacoes/:rid/veredito', () => {
  let app: INestApplication
  const prisma = new PrismaClient()

  beforeAll(async () => {
    app = await criarAppDeTeste()
  })

  beforeEach(async () => {
    await limparBanco(prisma)
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  async function publicar(sobrescrever: Record<string, unknown> = {}): Promise<{ id: string; codigoEdicao: string }> {
    const { body } = await request(app.getHttpServer()).post('/casos').send(casoValido(sobrescrever)).expect(201)
    return body
  }

  async function criarReivindicacao(casoId: string, telefone = '93991112233', casoProprio?: { id: string; codigoEdicao: string }) {
    const { body: perguntas } = await request(app.getHttpServer()).get(`/casos/${casoId}/perguntas`).expect(200)
    const { body } = await request(app.getHttpServer())
      .post(`/casos/${casoId}/reivindicacoes`)
      .send({
        respostas: perguntas.map((p: { id: string }) => ({ perguntaId: p.id, texto: 'resp' })),
        pessoa: { nome: 'Reivindicante', telefone },
        casoProprio,
      })
      .expect(201)
    return body as { id: string; codigoAcompanhamento: string; veredito: string }
  }

  it('exige x-codigo-edicao válido (403) e caso/reivindicação existente (404)', async () => {
    const { id, codigoEdicao } = await publicar()
    const reiv = await criarReivindicacao(id)

    await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes/${reiv.id}/veredito`)
      .send({ veredito: 'aceita' })
      .expect(403)

    await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes/${randomUUID()}/veredito`)
      .set('x-codigo-edicao', codigoEdicao)
      .send({ veredito: 'aceita' })
      .expect(404)
  })

  it('aceitar muda caso para em_contato, grava decidido_em e limpa cobrado_em', async () => {
    const { id, codigoEdicao } = await publicar()
    const reiv = await criarReivindicacao(id)

    // Simula cobrança pendente
    await prisma.caso.update({
      where: { id },
      data: { cobradoEm: new Date(Date.now() - 3600_000) },
    })

    const { body } = await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes/${reiv.id}/veredito`)
      .set('x-codigo-edicao', codigoEdicao)
      .send({ veredito: 'aceita' })
      .expect(200)

    expect(body).toEqual({ id: reiv.id, veredito: 'aceita' })

    const casoAtualizado = await prisma.caso.findUniqueOrThrow({ where: { id } })
    expect(casoAtualizado.estado).toBe('em_contato')
    expect(casoAtualizado.cobradoEm).toBeNull()

    const tentativaAtualizada = await prisma.tentativaVerificacao.findUniqueOrThrow({ where: { id: reiv.id } })
    expect(tentativaAtualizada.veredito).toBe('aceita')
    expect(tentativaAtualizada.decididoEm).not.toBeNull()
  })

  it('aceitar uma segunda reivindicação quando já está em_contato dá 409', async () => {
    const { id, codigoEdicao } = await publicar()
    const r1 = await criarReivindicacao(id, '93991112233')
    const r2 = await criarReivindicacao(id, '93991114455')

    await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes/${r1.id}/veredito`)
      .set('x-codigo-edicao', codigoEdicao)
      .send({ veredito: 'aceita' })
      .expect(200)

    await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes/${r2.id}/veredito`)
      .set('x-codigo-edicao', codigoEdicao)
      .send({ veredito: 'aceita' })
      .expect(409)
  })

  it('exige telefone (422) ao aceitar quando o autor não informou telefone na publicação', async () => {
    const { id, codigoEdicao } = await publicar({
      tipo: 'encontrado',
      autor: { nome: 'Autor sem tel' }, // telefone omitido
    })
    const reiv = await criarReivindicacao(id)

    // Sem telefone no corpo -> 422
    await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes/${reiv.id}/veredito`)
      .set('x-codigo-edicao', codigoEdicao)
      .send({ veredito: 'aceita' })
      .expect(422)

    // Com telefone válido no corpo -> 200 e grava no autor
    await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes/${reiv.id}/veredito`)
      .set('x-codigo-edicao', codigoEdicao)
      .send({ veredito: 'aceita', telefone: '93999887766' })
      .expect(200)

    const caso = await prisma.caso.findUniqueOrThrow({
      where: { id },
      include: { autor: true },
    })
    expect(caso.autor.telefone).toBe('93999887766')
    expect(caso.estado).toBe('em_contato')
  })

  it('ao aceitar com caso_proprio_id, leva o caso próprio a em_contato e confirma pareamento', async () => {
    const perdido = await publicar({ tipo: 'perdido' })
    const encontrado = await publicar({
      tipo: 'encontrado',
      local: { ...casoValido().local, ...aoSul(CENTRO_SANTAREM, 500) },
      animal: { ...casoValido().animal, nome: undefined, castrado: undefined },
    })

    // O pareamento já foi gerado automaticamente na publicação
    const par = await prisma.pareamento.findUniqueOrThrow({
      where: {
        casoPerdidoId_casoEncontradoId: {
          casoPerdidoId: perdido.id,
          casoEncontradoId: encontrado.id,
        },
      },
    })
    expect(par.veredito).toBe('pendente')

    const reiv = await criarReivindicacao(perdido.id, '93991223344', {
      id: encontrado.id,
      codigoEdicao: encontrado.codigoEdicao,
    })

    await request(app.getHttpServer())
      .post(`/casos/${perdido.id}/reivindicacoes/${reiv.id}/veredito`)
      .set('x-codigo-edicao', perdido.codigoEdicao)
      .send({ veredito: 'aceita' })
      .expect(200)

    const perdidoAtualizado = await prisma.caso.findUniqueOrThrow({ where: { id: perdido.id } })
    const encontradoAtualizado = await prisma.caso.findUniqueOrThrow({ where: { id: encontrado.id } })
    expect(perdidoAtualizado.estado).toBe('em_contato')
    expect(encontradoAtualizado.estado).toBe('em_contato')

    const parAtualizado = await prisma.pareamento.findUniqueOrThrow({ where: { id: par.id } })
    expect(parAtualizado.veredito).toBe('confirmado')
    expect(parAtualizado.decididoEm).not.toBeNull()
  })

  it('recusar altera veredito da tentativa sem mudar o estado do caso', async () => {
    const { id, codigoEdicao } = await publicar()
    const reiv = await criarReivindicacao(id)

    const { body } = await request(app.getHttpServer())
      .post(`/casos/${id}/reivindicacoes/${reiv.id}/veredito`)
      .set('x-codigo-edicao', codigoEdicao)
      .send({ veredito: 'recusada' })
      .expect(200)

    expect(body).toEqual({ id: reiv.id, veredito: 'recusada' })

    const caso = await prisma.caso.findUniqueOrThrow({ where: { id } })
    expect(caso.estado).toBe('procurando')

    const tentativa = await prisma.tentativaVerificacao.findUniqueOrThrow({ where: { id: reiv.id } })
    expect(tentativa.veredito).toBe('recusada')
    expect(tentativa.decididoEm).not.toBeNull()
  })
})
