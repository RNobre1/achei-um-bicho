import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'

const CHAVE_TESTE = 'chave-tarefas-teste'

describe('POST /tarefas/ciclo-de-vida', () => {
  let app: INestApplication
  const prisma = new PrismaClient()

  beforeAll(async () => {
    process.env.TAREFAS_CHAVE = CHAVE_TESTE
    app = await criarAppDeTeste()
  })

  beforeEach(async () => {
    await limparBanco(prisma)
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
    delete process.env.TAREFAS_CHAVE
  })

  async function publicar(): Promise<{ id: string; codigoEdicao: string }> {
    const { body } = await request(app.getHttpServer()).post('/casos').send(casoValido()).expect(201)
    return body
  }

  function executarTarefas(chave: string = CHAVE_TESTE) {
    return request(app.getHttpServer())
      .post('/tarefas/ciclo-de-vida')
      .set('x-chave-tarefas', chave)
  }

  it('cobra caso vigiado sem interação há mais de 9 dias', async () => {
    const { id } = await publicar()
    await prisma.$executeRaw`UPDATE caso SET ultima_interacao_em = now() - interval '10 days' WHERE id = ${id}::uuid`

    const { body } = await executarTarefas().expect(200)

    expect(body).toMatchObject({ cobrados: 1, expirados: 0, anonimizados: 0 })
    const caso = await prisma.caso.findUniqueOrThrow({ where: { id } })
    expect(caso.cobradoEm).not.toBeNull()
  })

  it('expira caso cobrado há mais de 6 dias (15 - 9), mas não expira caso não cobrado', async () => {
    const cobrado = await publicar()
    await prisma.$executeRaw`UPDATE caso SET cobrado_em = now() - interval '7 days', ultima_interacao_em = now() - interval '16 days' WHERE id = ${cobrado.id}::uuid`

    const naoCobrado = await publicar()
    await prisma.$executeRaw`UPDATE caso SET ultima_interacao_em = now() - interval '20 days' WHERE id = ${naoCobrado.id}::uuid`

    const { body } = await executarTarefas().expect(200)

    // O primeiro expira; o segundo apenas é cobrado nesta rodada!
    expect(body).toMatchObject({ cobrados: 1, expirados: 1, anonimizados: 0 })
    const caso1 = await prisma.caso.findUniqueOrThrow({ where: { id: cobrado.id } })
    expect(caso1.estado).toBe('expirado')

    const caso2 = await prisma.caso.findUniqueOrThrow({ where: { id: naoCobrado.id } })
    expect(caso2.estado).toBe('procurando')
    expect(caso2.cobradoEm).not.toBeNull()
  })

  it('anonimiza autor, reivindicante e referências de casos encerrados há mais de 30 dias', async () => {
    const { id, codigoEdicao } = await publicar()

    // Adiciona uma reivindicação
    const reivindicante = await prisma.pessoa.create({
      data: { nome: 'José Silva', telefone: '93991234567' },
    })
    await prisma.tentativaVerificacao.create({
      data: {
        casoId: id,
        pessoaId: reivindicante.id,
        codigoAcompanhamento: 'hash-acompanhamento',
        referencia: 'Perto do mercado São José',
        veredito: 'recusada',
      },
    })

    // Encerra o caso com desfecho
    await request(app.getHttpServer())
      .post(`/casos/${id}/desfecho`)
      .set('x-codigo-edicao', codigoEdicao)
      .send({ tipo: 'voltou_para_casa', ocorridoEm: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString() })
      .expect(201)

    // Envelhece o caso, desfecho e interação para 31 dias atrás
    await prisma.$executeRaw`UPDATE desfecho SET registrado_em = now() - interval '31 days' WHERE caso_id = ${id}::uuid`
    await prisma.$executeRaw`UPDATE caso SET ultima_interacao_em = now() - interval '31 days' WHERE id = ${id}::uuid`

    const { body } = await executarTarefas().expect(200)

    expect(body.anonimizados).toBe(1)

    // Confere se autor e reivindicante foram anonimizados
    const caso = await prisma.caso.findUniqueOrThrow({
      where: { id },
      include: { autor: true, local: true, tentativas: { include: { pessoa: true } } },
    })
    expect(caso.autor.nome).toBe('Anônimo')
    expect(caso.autor.telefone).toBeNull()
    expect(caso.local.referencia).toBeNull()

    const tentativa = caso.tentativas[0]
    expect(tentativa.pessoa.nome).toBe('Anônimo')
    expect(tentativa.pessoa.telefone).toBeNull()
    expect(tentativa.referencia).toBeNull()
  })

  it('é idempotente: rodar duas vezes seguidas retorna zeros na segunda', async () => {
    const { id } = await publicar()
    await prisma.$executeRaw`UPDATE caso SET ultima_interacao_em = now() - interval '10 days' WHERE id = ${id}::uuid`

    const primeira = await executarTarefas().expect(200)
    expect(primeira.body).toEqual({ cobrados: 1, expirados: 0, anonimizados: 0 })

    const segunda = await executarTarefas().expect(200)
    expect(segunda.body).toEqual({ cobrados: 0, expirados: 0, anonimizados: 0 })
  })

  it('recusa chave de tarefas incorreta com 403', async () => {
    await executarTarefas('chave-errada').expect(403)
  })
})

describe('POST /tarefas/ciclo-de-vida sem chave configurada', () => {
  let app: INestApplication
  const prisma = new PrismaClient()

  beforeAll(async () => {
    delete process.env.TAREFAS_CHAVE
    app = await criarAppDeTeste()
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  it('retorna 503 quando TAREFAS_CHAVE não estiver configurada', async () => {
    await request(app.getHttpServer())
      .post('/tarefas/ciclo-de-vida')
      .set('x-chave-tarefas', 'qualquer-chave')
      .expect(503)
  })
})
