import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'
import { areaAproximada } from '../geo/area-aproximada'
import { PrismaService } from '../prisma/prisma.service'
import { TarefasService } from './tarefas.service'

const CHAVE_TESTE = 'chave-tarefas-teste'

describe('POST /tarefas/ciclo-de-vida', () => {
  let app: INestApplication
  const prisma = new PrismaClient()

  beforeAll(async () => {
    process.env.TAREFAS_CHAVE = CHAVE_TESTE
    app = await criarAppDeTeste()
  })

  beforeEach(async () => {
    vi.restoreAllMocks()
    await limparBanco(prisma)
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
    delete process.env.TAREFAS_CHAVE
  })

  async function publicar(sobrescrever: Record<string, unknown> = {}): Promise<{ id: string; codigoEdicao: string }> {
    const { body } = await request(app.getHttpServer()).post('/casos').send(casoValido(sobrescrever)).expect(201)
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

  it('não expira caso que interagiu após cobrança (cobrado d9, interagiu d12, tarefa d15)', async () => {
    const { id } = await publicar()
    // Cobrado 6 dias atrás, mas teve interação 3 dias atrás (após a cobrança)
    await prisma.$executeRaw`UPDATE caso SET cobrado_em = now() - interval '6 days', ultima_interacao_em = now() - interval '3 days' WHERE id = ${id}::uuid`

    const { body } = await executarTarefas().expect(200)

    expect(body.expirados).toBe(0)
    const caso = await prisma.caso.findUniqueOrThrow({ where: { id } })
    expect(caso.estado).toBe('procurando')
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

  it('anonimiza autor, reivindicante, referências, ponto aproximado e perguntas/respostas de casos encerrados há mais de 30 dias', async () => {
    const pontoOriginal = { latitude: -2.4385, longitude: -54.7155 }
    const { id, codigoEdicao } = await publicar({ local: { ...casoValido().local, ...pontoOriginal } })

    // Adiciona uma reivindicação com resposta de verificação
    const reivindicante = await prisma.pessoa.create({
      data: { nome: 'José Silva', telefone: '93991234567' },
    })
    const tentativa = await prisma.tentativaVerificacao.create({
      data: {
        casoId: id,
        pessoaId: reivindicante.id,
        codigoAcompanhamento: 'hash-acompanhamento',
        referencia: 'Perto do mercado São José',
        veredito: 'recusada',
      },
    })
    const perguntas = await prisma.perguntaVerificacao.findMany({ where: { casoId: id } })
    await prisma.respostaVerificacao.create({
      data: {
        tentativaId: tentativa.id,
        perguntaId: perguntas[0]!.id,
        texto: 'Ele tem uma mancha branca na pata esquerda',
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
      include: {
        autor: true,
        local: true,
        perguntas: true,
        tentativas: { include: { pessoa: true, respostas: true } },
      },
    })
    expect(caso.autor.nome).toBe('Anônimo')
    expect(caso.autor.telefone).toBeNull()
    expect(caso.local.referencia).toBeNull()

    // Confere se o ponto passou a ser o centro da área aproximada
    const { centro } = areaAproximada(id, pontoOriginal, caso.local.raioImprecisaoM)
    const [pontoNoBanco] = await prisma.$queryRaw<{ latitude: number; longitude: number }[]>`
      SELECT ST_Y(ponto::geometry) AS latitude, ST_X(ponto::geometry) AS longitude
        FROM local
       WHERE id = ${caso.localId}::uuid
    `
    expect(pontoNoBanco?.latitude).toBeCloseTo(centro.latitude, 6)
    expect(pontoNoBanco?.longitude).toBeCloseTo(centro.longitude, 6)
    // O ponto aproximado difere do original
    expect(pontoNoBanco?.latitude).not.toBe(pontoOriginal.latitude)

    // Confere se as perguntas foram anonimizadas
    for (const p of caso.perguntas) {
      expect(p.respostaEsperada).toBe('anonimizado')
    }

    // Confere se as respostas e reivindicante foram anonimizados
    const t = caso.tentativas[0]!
    expect(t.pessoa.nome).toBe('Anônimo')
    expect(t.pessoa.telefone).toBeNull()
    expect(t.referencia).toBeNull()
    expect(t.respostas[0]!.texto).toBe('anonimizado')
  })

  it('anonimiza caso expirado há mais de 30 dias', async () => {
    const { id } = await publicar()
    await prisma.caso.update({
      where: { id },
      data: { estado: 'expirado', cobradoEm: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) },
    })
    await prisma.$executeRaw`UPDATE caso SET ultima_interacao_em = now() - interval '31 days' WHERE id = ${id}::uuid`

    const { body } = await executarTarefas().expect(200)
    expect(body.anonimizados).toBe(1)

    const caso = await prisma.caso.findUniqueOrThrow({
      where: { id },
      include: { autor: true, perguntas: true },
    })
    expect(caso.autor.nome).toBe('Anônimo')
    expect(caso.autor.telefone).toBeNull()
    for (const p of caso.perguntas) {
      expect(p.respostaEsperada).toBe('anonimizado')
    }
  })

  it('duas execuções simultâneas anonimiza o mesmo caso uma única vez', async () => {
    const pontoOriginal = { latitude: -2.4385, longitude: -54.7155 }
    const { id } = await publicar({ local: { ...casoValido().local, ...pontoOriginal } })
    await prisma.caso.update({
      where: { id },
      data: { estado: 'expirado', ultimaInteracaoEm: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) },
    })
    const caso = await prisma.caso.findUniqueOrThrow({
      where: { id },
      select: { local: { select: { raioImprecisaoM: true } } },
    })

    const prismaDaApi = app.get(PrismaService)
    const findManyOriginal = prismaDaApi.caso.findMany.bind(prismaDaApi.caso)
    let candidaturasLidas = 0
    let liberarBarreira!: () => void
    const barreira = new Promise<void>((resolve) => {
      liberarBarreira = resolve
    })
    vi.spyOn(prismaDaApi.caso, 'findMany').mockImplementation(((argumentos: any) => {
      const consulta = findManyOriginal(argumentos)
      if (!argumentos?.where?.AND) return consulta
      return consulta.then(async (candidatos) => {
        candidaturasLidas++
        if (candidaturasLidas === 2) liberarBarreira()
        await barreira
        return candidatos
      }) as any
    }) as any)

    const resultados = await Promise.all([executarTarefas().expect(200), executarTarefas().expect(200)])

    expect(resultados.map(({ body }) => body.anonimizados).sort()).toEqual([0, 1])
    const [pontoFinal] = await prisma.$queryRaw<{ latitude: number; longitude: number }[]>`
      SELECT ST_Y(ponto::geometry) AS latitude, ST_X(ponto::geometry) AS longitude
        FROM local
        JOIN caso ON caso.local_id = local.id
       WHERE caso.id = ${id}::uuid
    `
    const { centro } = areaAproximada(id, pontoOriginal, caso.local.raioImprecisaoM)
    expect(pontoFinal?.latitude).toBeCloseTo(centro.latitude, 6)
    expect(pontoFinal?.longitude).toBeCloseTo(centro.longitude, 6)
  })

  it('retorna 500 se uma anonimização falha e ainda anonimiza os outros casos', async () => {
    const autorA = 'Autor reservado da falha'
    const autorB = 'Autor reservado processado'
    const casoA = await publicar({ autor: { nome: autorA, telefone: '93991110001' } })
    const casoB = await publicar({ autor: { nome: autorB, telefone: '93991110002' } })
    const ultimaInteracaoAntiga = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
    await prisma.caso.updateMany({
      where: { id: { in: [casoA.id, casoB.id] } },
      data: { estado: 'expirado', ultimaInteracaoEm: ultimaInteracaoAntiga },
    })

    const prismaDaApi = app.get(PrismaService)
    const transacao = vi.spyOn(prismaDaApi, '$transaction').mockRejectedValueOnce(new Error('falha simulada'))
    const logger = (app.get(TarefasService) as any).logger
    const registro = vi.spyOn(logger, 'error')

    const resposta = await executarTarefas()
    const autores = await prisma.pessoa.findMany({
      where: { nome: { in: [autorA, autorB, 'Anônimo'] } },
      select: { nome: true, telefone: true },
    })
    const autorAnonimizado = autores.filter((autor) => autor.nome === 'Anônimo')
    const textoDoLog = registro.mock.calls.flat().map(String).join(' ')

    expect.soft(resposta.status).toBe(500)
    expect.soft(transacao).toHaveBeenCalledTimes(2)
    expect.soft(autorAnonimizado).toHaveLength(1)
    expect.soft(textoDoLog).toMatch(/Error/)
    expect.soft(textoDoLog).toMatch(new RegExp(`${casoA.id}|${casoB.id}`))
    expect.soft(textoDoLog).not.toContain(autorA)
    expect.soft(textoDoLog).not.toContain(autorB)
  })

  it('uma segunda rodada sequencial não altera dados já anonimizados', async () => {
    const pontoOriginal = { latitude: -2.4385, longitude: -54.7155 }
    const { id } = await publicar({ local: { ...casoValido().local, ...pontoOriginal } })
    await prisma.caso.update({
      where: { id },
      data: { estado: 'expirado', ultimaInteracaoEm: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) },
    })

    const primeira = await executarTarefas().expect(200)
    expect(primeira.body.anonimizados).toBe(1)
    const pontoAposPrimeira = await prisma.$queryRaw<{ latitude: number; longitude: number }[]>`
      SELECT ST_Y(ponto::geometry) AS latitude, ST_X(ponto::geometry) AS longitude
        FROM local
        JOIN caso ON caso.local_id = local.id
       WHERE caso.id = ${id}::uuid
    `

    const segunda = await executarTarefas().expect(200)
    const pontoAposSegunda = await prisma.$queryRaw<{ latitude: number; longitude: number }[]>`
      SELECT ST_Y(ponto::geometry) AS latitude, ST_X(ponto::geometry) AS longitude
        FROM local
        JOIN caso ON caso.local_id = local.id
       WHERE caso.id = ${id}::uuid
    `

    expect(segunda.body.anonimizados).toBe(0)
    expect(pontoAposSegunda).toEqual(pontoAposPrimeira)
  })

  it('não anonimiza caso resolvido há 29 dias', async () => {
    const { id, codigoEdicao } = await publicar()
    await request(app.getHttpServer())
      .post(`/casos/${id}/desfecho`)
      .set('x-codigo-edicao', codigoEdicao)
      .send({ tipo: 'voltou_para_casa', ocorridoEm: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() })
      .expect(201)

    await prisma.$executeRaw`UPDATE desfecho SET registrado_em = now() - interval '29 days' WHERE caso_id = ${id}::uuid`
    await prisma.$executeRaw`UPDATE caso SET ultima_interacao_em = now() - interval '29 days' WHERE id = ${id}::uuid`

    const { body } = await executarTarefas().expect(200)
    expect(body.anonimizados).toBe(0)

    const caso = await prisma.caso.findUniqueOrThrow({
      where: { id },
      include: { autor: true },
    })
    expect(caso.autor.nome).not.toBe('Anônimo')
  })

  it('não anonimiza caso em_contato mesmo com mais de 30 dias', async () => {
    const { id } = await publicar()
    await prisma.caso.update({
      where: { id },
      data: { estado: 'em_contato' },
    })
    await prisma.$executeRaw`UPDATE caso SET ultima_interacao_em = now() - interval '35 days' WHERE id = ${id}::uuid`

    const { body } = await executarTarefas().expect(200)
    expect(body.anonimizados).toBe(0)

    const caso = await prisma.caso.findUniqueOrThrow({
      where: { id },
      include: { autor: true },
    })
    expect(caso.autor.nome).not.toBe('Anônimo')
    expect(caso.estado).toBe('em_contato')
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
