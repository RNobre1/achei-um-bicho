import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'
import { aoSul, CENTRO_SANTAREM } from '../../test/pontos'

const UMA_HORA = 60 * 60 * 1000

describe('F8 ciclo de vida', () => {
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

  describe('GET /casos/:id/situacao', () => {
    it('retorna a situação completa do caso para o autor', async () => {
      const { id, codigoEdicao } = await publicar()

      const { body } = await request(app.getHttpServer())
        .get(`/casos/${id}/situacao`)
        .set('x-codigo-edicao', codigoEdicao)
        .expect(200)

      expect(body).toEqual({
        id,
        estado: 'procurando',
        cobrancaPendente: false,
        diasSemInteracao: 0,
        reivindicacoesPendentes: 0,
        desfecho: null,
      })
    })

    it('caso expirado com cobrado_em preenchido não indica cobrança pendente', async () => {
      const { id, codigoEdicao } = await publicar()
      await prisma.caso.update({ where: { id }, data: { estado: 'expirado', cobradoEm: new Date() } })

      const { body } = await request(app.getHttpServer())
        .get(`/casos/${id}/situacao`)
        .set('x-codigo-edicao', codigoEdicao)
        .expect(200)

      expect(body.cobrancaPendente).toBe(false)
      expect(body.estado).toBe('expirado')
    })

    it('indica cobrança pendente quando cobrado_em está preenchido ou sem interação há tempo', async () => {
      const { id, codigoEdicao } = await publicar()
      await prisma.$executeRaw`UPDATE caso SET cobrado_em = now(), ultima_interacao_em = now() - interval '9 days' WHERE id = ${id}::uuid`

      const { body } = await request(app.getHttpServer())
        .get(`/casos/${id}/situacao`)
        .set('x-codigo-edicao', codigoEdicao)
        .expect(200)

      expect(body.cobrancaPendente).toBe(true)
      expect(body.diasSemInteracao).toBe(9)
    })

    it('conta reivindicações pendentes', async () => {
      const { id, codigoEdicao } = await publicar()
      const pessoa = await prisma.pessoa.create({ data: { nome: 'Reivindicante', telefone: '93991112222' } })
      await prisma.tentativaVerificacao.create({
        data: {
          casoId: id,
          pessoaId: pessoa.id,
          codigoAcompanhamento: 'hash-1',
          veredito: 'pendente',
        },
      })

      const { body } = await request(app.getHttpServer())
        .get(`/casos/${id}/situacao`)
        .set('x-codigo-edicao', codigoEdicao)
        .expect(200)

      expect(body.reivindicacoesPendentes).toBe(1)
    })

    it('recusa sem o código de edição correto (403)', async () => {
      const { id } = await publicar()
      await request(app.getHttpServer()).get(`/casos/${id}/situacao`).expect(403)
      await request(app.getHttpServer())
        .get(`/casos/${id}/situacao`)
        .set('x-codigo-edicao', 'ERRADO-123')
        .expect(403)
    })

    it('responde 404 para caso inexistente', async () => {
      await request(app.getHttpServer())
        .get(`/casos/${randomUUID()}/situacao`)
        .set('x-codigo-edicao', 'ABCD-EFGH')
        .expect(404)
    })
  })

  describe('POST /casos/:id/confirmacao', () => {
    it('renova a última interação e zera cobrado_em', async () => {
      const { id, codigoEdicao } = await publicar()
      await prisma.$executeRaw`UPDATE caso SET cobrado_em = now(), ultima_interacao_em = now() - interval '9 days' WHERE id = ${id}::uuid`

      await request(app.getHttpServer())
        .post(`/casos/${id}/confirmacao`)
        .set('x-codigo-edicao', codigoEdicao)
        .expect(200)

      const caso = await prisma.caso.findUniqueOrThrow({ where: { id } })
      expect(caso.cobradoEm).toBeNull()
      expect(caso.cobradoEm).toBeNull()
      expect(Date.now() - caso.ultimaInteracaoEm.getTime()).toBeLessThan(60_000)
    })

    it('confirmar caso que já foi expirado pela tarefa dá 409', async () => {
      const { id, codigoEdicao } = await publicar()
      await prisma.caso.update({ where: { id }, data: { estado: 'expirado', cobradoEm: new Date() } })

      await request(app.getHttpServer())
        .post(`/casos/${id}/confirmacao`)
        .set('x-codigo-edicao', codigoEdicao)
        .expect(409)
    })

    it('recusa com 409 quando o caso não está em ESTADOS_VIGIADOS', async () => {
      const { id, codigoEdicao } = await publicar()
      await prisma.caso.update({ where: { id }, data: { estado: 'resolvido' } })

      await request(app.getHttpServer())
        .post(`/casos/${id}/confirmacao`)
        .set('x-codigo-edicao', codigoEdicao)
        .expect(409)
    })

    it('recusa sem o código de edição correto (403)', async () => {
      const { id } = await publicar()
      await request(app.getHttpServer()).post(`/casos/${id}/confirmacao`).expect(403)
      await request(app.getHttpServer())
        .post(`/casos/${id}/confirmacao`)
        .set('x-codigo-edicao', 'ERRADO-123')
        .expect(403)
    })

    it('responde 404 para caso inexistente', async () => {
      await request(app.getHttpServer())
        .post(`/casos/${randomUUID()}/confirmacao`)
        .set('x-codigo-edicao', 'ABCD-EFGH')
        .expect(404)
    })
  })

  describe('POST /casos/:id/reabertura', () => {
    it('de em_contato volta ao estado inicial do caso e renova interação zerando cobrado_em', async () => {
      const perdido = await publicar()
      await prisma.caso.update({ where: { id: perdido.id }, data: { estado: 'em_contato' } })
      await prisma.$executeRaw`UPDATE caso SET ultima_interacao_em = now() - interval '8 days', cobrado_em = now() - interval '2 days' WHERE id = ${perdido.id}::uuid`

      await request(app.getHttpServer())
        .post(`/casos/${perdido.id}/reabertura`)
        .set('x-codigo-edicao', perdido.codigoEdicao)
        .expect(200)

      const casoPerdido = await prisma.caso.findUniqueOrThrow({ where: { id: perdido.id } })
      expect(casoPerdido.estado).toBe('procurando')
      expect(casoPerdido.cobradoEm).toBeNull()
      expect(Date.now() - casoPerdido.ultimaInteracaoEm.getTime()).toBeLessThan(60_000)

      const achado = await publicar({ tipo: 'encontrado' })
      await prisma.caso.update({ where: { id: achado.id }, data: { estado: 'em_contato' } })

      await request(app.getHttpServer())
        .post(`/casos/${achado.id}/reabertura`)
        .set('x-codigo-edicao', achado.codigoEdicao)
        .expect(200)

      const casoAchado = await prisma.caso.findUniqueOrThrow({ where: { id: achado.id } })
      expect(casoAchado.estado).toBe('abrigado_temporariamente')
    })

    it('ao reabrir, desfaz o contato passando reivindicação aceita para recusada e revertendo caso próprio', async () => {
      const perdido = await publicar({ tipo: 'perdido' })
      await prisma.caso.update({ where: { id: perdido.id }, data: { estado: 'em_contato' } })

      const achado = await publicar({ tipo: 'encontrado' })
      await prisma.caso.update({ where: { id: achado.id }, data: { estado: 'em_contato' } })

      const pessoa = await prisma.pessoa.create({ data: { nome: 'Reivindicante', telefone: '93991234567' } })
      const tentativa = await prisma.tentativaVerificacao.create({
        data: {
          casoId: perdido.id,
          pessoaId: pessoa.id,
          casoProprioId: achado.id,
          codigoAcompanhamento: 'hash-acompanha-1',
          veredito: 'aceita',
          decididoEm: new Date(Date.now() - 3600_000),
        },
      })

      await request(app.getHttpServer())
        .post(`/casos/${perdido.id}/reabertura`)
        .set('x-codigo-edicao', perdido.codigoEdicao)
        .expect(200)

      const tentativaApos = await prisma.tentativaVerificacao.findUniqueOrThrow({ where: { id: tentativa.id } })
      expect(tentativaApos.veredito).toBe('recusada')
      expect(tentativaApos.decididoEm).not.toBeNull()

      const achadoApos = await prisma.caso.findUniqueOrThrow({ where: { id: achado.id } })
      expect(achadoApos.estado).toBe('abrigado_temporariamente')
    })

    it('reabrir caso depois de expirado dá 409', async () => {
      const { id, codigoEdicao } = await publicar()
      await prisma.caso.update({ where: { id }, data: { estado: 'expirado' } })

      await request(app.getHttpServer())
        .post(`/casos/${id}/reabertura`)
        .set('x-codigo-edicao', codigoEdicao)
        .expect(409)
    })

    it('recusa com 409 quando o caso não está em em_contato', async () => {
      const { id, codigoEdicao } = await publicar()

      await request(app.getHttpServer())
        .post(`/casos/${id}/reabertura`)
        .set('x-codigo-edicao', codigoEdicao)
        .expect(409)
    })

    it('recusa sem o código de edição correto (403)', async () => {
      const { id } = await publicar()
      await request(app.getHttpServer()).post(`/casos/${id}/reabertura`).expect(403)
      await request(app.getHttpServer())
        .post(`/casos/${id}/reabertura`)
        .set('x-codigo-edicao', 'ERRADO-123')
        .expect(403)
    })

    it('responde 404 para caso inexistente', async () => {
      await request(app.getHttpServer())
        .post(`/casos/${randomUUID()}/reabertura`)
        .set('x-codigo-edicao', 'ABCD-EFGH')
        .expect(404)
    })
  })

  describe('POST /casos/:id/desfecho', () => {
    it('registra o desfecho e muda o estado para resolvido, renovando interação', async () => {
      const { id, codigoEdicao } = await publicar()
      await prisma.$executeRaw`UPDATE caso SET ultima_interacao_em = now() - interval '8 days' WHERE id = ${id}::uuid`

      const ocorridoEm = new Date(Date.now() - UMA_HORA).toISOString()
      await request(app.getHttpServer())
        .post(`/casos/${id}/desfecho`)
        .set('x-codigo-edicao', codigoEdicao)
        .send({ tipo: 'voltou_para_casa', ocorridoEm })
        .expect(201)

      const caso = await prisma.caso.findUniqueOrThrow({
        where: { id },
        include: { desfecho: true },
      })
      expect(caso.estado).toBe('resolvido')
      expect(caso.desfecho).toMatchObject({
        tipo: 'voltou_para_casa',
        ocorridoEm: new Date(ocorridoEm),
      })
      expect(Date.now() - caso.ultimaInteracaoEm.getTime()).toBeLessThan(60_000)
    })

    it('permite informar desfecho de caso expirado', async () => {
      const { id, codigoEdicao } = await publicar()
      await prisma.caso.update({ where: { id }, data: { estado: 'expirado' } })

      const ocorridoEm = new Date().toISOString()
      await request(app.getHttpServer())
        .post(`/casos/${id}/desfecho`)
        .set('x-codigo-edicao', codigoEdicao)
        .send({ tipo: 'foi_adotado', ocorridoEm })
        .expect(201)

      const caso = await prisma.caso.findUniqueOrThrow({ where: { id } })
      expect(caso.estado).toBe('resolvido')
    })

    it('dois encerramentos simultâneos resultam em um sucesso (201) e um conflito (409)', async () => {
      const { id, codigoEdicao } = await publicar()
      const ocorridoEm = new Date().toISOString()
      const res = await Promise.all([
        request(app.getHttpServer()).post(`/casos/${id}/desfecho`).set('x-codigo-edicao', codigoEdicao).send({ tipo: 'voltou_para_casa', ocorridoEm }),
        request(app.getHttpServer()).post(`/casos/${id}/desfecho`).set('x-codigo-edicao', codigoEdicao).send({ tipo: 'voltou_para_casa', ocorridoEm }),
      ])
      const statuses = res.map((r) => r.status).sort()
      expect(statuses).toEqual([201, 409])
    })

    it('recusa com 409 quando o caso já está resolvido', async () => {
      const { id, codigoEdicao } = await publicar()
      await prisma.caso.update({ where: { id }, data: { estado: 'resolvido' } })

      await request(app.getHttpServer())
        .post(`/casos/${id}/desfecho`)
        .set('x-codigo-edicao', codigoEdicao)
        .send({ tipo: 'voltou_para_casa', ocorridoEm: new Date().toISOString() })
        .expect(409)
    })

    it.each([
      ['com data no futuro', { tipo: 'voltou_para_casa', ocorridoEm: new Date(Date.now() + 2 * UMA_HORA).toISOString() }],
      ['com tipo inválido', { tipo: 'alienigena', ocorridoEm: new Date().toISOString() }],
      ['sem tipo', { ocorridoEm: new Date().toISOString() }],
      ['sem ocorridoEm', { tipo: 'voltou_para_casa' }],
    ])('recusa desfecho inválido: %s', async (_caso, corpo) => {
      const { id, codigoEdicao } = await publicar()
      await request(app.getHttpServer())
        .post(`/casos/${id}/desfecho`)
        .set('x-codigo-edicao', codigoEdicao)
        .send(corpo)
        .expect(400)
    })

    it('recusa sem o código de edição correto (403)', async () => {
      const { id } = await publicar()
      await request(app.getHttpServer())
        .post(`/casos/${id}/desfecho`)
        .send({ tipo: 'voltou_para_casa', ocorridoEm: new Date().toISOString() })
        .expect(403)
    })

    it('responde 404 para caso inexistente', async () => {
      await request(app.getHttpServer())
        .post(`/casos/${randomUUID()}/desfecho`)
        .set('x-codigo-edicao', 'ABCD-EFGH')
        .send({ tipo: 'voltou_para_casa', ocorridoEm: new Date().toISOString() })
        .expect(404)
    })
  })

  describe('PATCH /casos/:id', () => {
    it('permite editar relato e animal de caso aberto, renovando a última interação e zerando cobrado_em', async () => {
      const { id, codigoEdicao } = await publicar()
      await prisma.$executeRaw`UPDATE caso SET ultima_interacao_em = now() - interval '8 days', cobrado_em = now() - interval '2 days' WHERE id = ${id}::uuid`

      await request(app.getHttpServer())
        .patch(`/casos/${id}`)
        .set('x-codigo-edicao', codigoEdicao)
        .send({
          relato: 'Novo relato editado pelo autor.',
          animal: {
            nome: 'Pipoca',
            castrado: false,
          },
        })
        .expect(200)

      const caso = await prisma.caso.findUniqueOrThrow({
        where: { id },
        include: { animal: true },
      })
      expect(caso.relato).toBe('Novo relato editado pelo autor.')
      expect(caso.animal.nome).toBe('Pipoca')
      expect(caso.animal.castrado).toBe(false)
      expect(Date.now() - caso.ultimaInteracaoEm.getTime()).toBeLessThan(60_000)
    })

    it('recusa relato com dados de contato (400)', async () => {
      const { id, codigoEdicao } = await publicar()

      await request(app.getHttpServer())
        .patch(`/casos/${id}`)
        .set('x-codigo-edicao', codigoEdicao)
        .send({ relato: 'Favor chamar no zap 93991234567' })
        .expect(400)
    })

    it('recusa editar caso que não está em ESTADOS_ABERTOS (409)', async () => {
      const { id, codigoEdicao } = await publicar()
      await prisma.caso.update({ where: { id }, data: { estado: 'em_contato' } })

      await request(app.getHttpServer())
        .patch(`/casos/${id}`)
        .set('x-codigo-edicao', codigoEdicao)
        .send({ relato: 'Tentando editar em contato' })
        .expect(409)
    })

    it('ao mudar porte, cor ou coleira, recalcula pistas mantendo as descartadas intactas', async () => {
      const nego = await publicar(casoValido({ animal: { ...casoValido().animal, corDominante: 'preto', coleira: 'com' } }))
      const achado = await publicar(casoValido({
        tipo: 'encontrado',
        animal: { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'sem' },
        local: { ...casoValido().local, ...aoSul(CENTRO_SANTAREM, 500) },
      }))

      // A pista inicial para nego e achado: cor divergem (preto x caramelo), coleira divergem (com x sem)
      const pistasIniciais = (await request(app.getHttpServer()).get(`/casos/${nego.id}/pistas`).set('x-codigo-edicao', nego.codigoEdicao)).body
      expect(pistasIniciais).toHaveLength(1)
      expect(pistasIniciais[0].divergem.some((d: { atributo: string }) => d.atributo === 'cor')).toBe(true)

      // Agora o autor de nego edita a corDominante para caramelo: agora a cor bate!
      await request(app.getHttpServer())
        .patch(`/casos/${nego.id}`)
        .set('x-codigo-edicao', nego.codigoEdicao)
        .send({ animal: { corDominante: 'caramelo' } })
        .expect(200)

      const pistasAposEdicao = (await request(app.getHttpServer()).get(`/casos/${nego.id}/pistas`).set('x-codigo-edicao', nego.codigoEdicao)).body
      expect(pistasAposEdicao).toHaveLength(1)
      expect(pistasAposEdicao[0].batem.some((b: { atributo: string }) => b.atributo === 'cor')).toBe(true)

      // Agora descarta a pista
      await request(app.getHttpServer())
        .post(`/casos/${nego.id}/pistas/${pistasAposEdicao[0].id}/veredito`)
        .set('x-codigo-edicao', nego.codigoEdicao)
        .send({ veredito: 'descartado' })
        .expect(200)

      // Autor edita a coleira para sem: a pista descartada NÃO volta!
      await request(app.getHttpServer())
        .patch(`/casos/${nego.id}`)
        .set('x-codigo-edicao', nego.codigoEdicao)
        .send({ animal: { coleira: 'sem' } })
        .expect(200)

      const pistasFinais = (await request(app.getHttpServer()).get(`/casos/${nego.id}/pistas`).set('x-codigo-edicao', nego.codigoEdicao)).body
      expect(pistasFinais).toHaveLength(0)

      const parNoBanco = await prisma.pareamento.findUniqueOrThrow({ where: { id: pistasAposEdicao[0].id } })
      expect(parNoBanco.veredito).toBe('descartado')
    })

    it('recusa sem o código de edição correto (403)', async () => {
      const { id } = await publicar()
      await request(app.getHttpServer())
        .patch(`/casos/${id}`)
        .send({ relato: 'Sem código' })
        .expect(403)
    })

    it('responde 404 para caso inexistente', async () => {
      await request(app.getHttpServer())
        .patch(`/casos/${randomUUID()}`)
        .set('x-codigo-edicao', 'ABCD-EFGH')
        .send({ relato: 'Inexistente' })
        .expect(404)
    })

    it('limpa relato e nome gravando null quando enviados como string vazia', async () => {
      const { id, codigoEdicao } = await publicar({ relato: 'Relato inicial', animal: { ...casoValido().animal, nome: 'Rex' } })

      await request(app.getHttpServer())
        .patch(`/casos/${id}`)
        .set('x-codigo-edicao', codigoEdicao)
        .send({ relato: '', animal: { nome: '' } })
        .expect(200)

      const caso = await prisma.caso.findUniqueOrThrow({ where: { id }, include: { animal: true } })
      expect(caso.relato).toBeNull()
      expect(caso.animal.nome).toBeNull()
    })

    it('recusa alteração de espécie com 400', async () => {
      const { id, codigoEdicao } = await publicar()

      await request(app.getHttpServer())
        .patch(`/casos/${id}`)
        .set('x-codigo-edicao', codigoEdicao)
        .send({ animal: { especie: 'gato' } })
        .expect(400)
    })

    it('respeita limite de 600 caracteres no relato e 60 no nome', async () => {
      const { id, codigoEdicao } = await publicar()

      await request(app.getHttpServer())
        .patch(`/casos/${id}`)
        .set('x-codigo-edicao', codigoEdicao)
        .send({ relato: 'a'.repeat(601) })
        .expect(400)

      await request(app.getHttpServer())
        .patch(`/casos/${id}`)
        .set('x-codigo-edicao', codigoEdicao)
        .send({ animal: { nome: 'a'.repeat(61) } })
        .expect(400)

      await request(app.getHttpServer())
        .patch(`/casos/${id}`)
        .set('x-codigo-edicao', codigoEdicao)
        .send({ relato: 'a'.repeat(600), animal: { nome: 'a'.repeat(60) } })
        .expect(200)
    })
  })
})
