import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'

describe('POST /casos recusa publicação inválida', () => {
  let app: INestApplication
  const prisma = new PrismaClient()
  const pergunta = { enunciado: 'Qual o nome?', respostaEsperada: 'Nego' }

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

  const invalidos: [string, Record<string, unknown>][] = [
    ['espécie fora do vocabulário', { animal: { ...casoValido().animal, especie: 'papagaio' } }],
    ['cor fora do vocabulário', { animal: { ...casoValido().animal, corDominante: 'roxo' } }],
    ['só duas perguntas de verificação', { perguntas: [pergunta, pergunta] }],
    ['quatro perguntas de verificação', { perguntas: [pergunta, pergunta, pergunta, pergunta] }],
    ['latitude impossível', { local: { ...casoValido().local, latitude: 91 } }],
    ['autor sem nome', { autor: { telefone: '93991234567' } }],
    ['autor com telefone inválido', { autor: { nome: 'Autor', telefone: '123' } }],
    ['data que não é data', { ocorridoEm: 'sábado passado' }],
    ['data no futuro', { ocorridoEm: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() }],
    ['estado escolhido pelo cliente', { estado: 'resolvido' }],
    ['só idCliente sem codigoEdicao', { idCliente: 'c4e433a0-1234-4b56-8a90-123456789abc' }],
    ['só codigoEdicao sem idCliente', { codigoEdicao: '2345-6789' }],
    ['codigoEdicao fora do formato', { idCliente: 'c4e433a0-1234-4b56-8a90-123456789abc', codigoEdicao: 'INVALIDO' }],
    ['idCliente que não é uuid', { idCliente: 'nao-e-uuid', codigoEdicao: '2345-6789' }],
  ]

  it.each(invalidos)('recusa %s, sem gravar nada', async (_motivo, alteracao) => {
    await request(app.getHttpServer()).post('/casos').send(casoValido(alteracao)).expect(400)
    expect(await prisma.caso.count()).toBe(0)
  })

  it('aceita a hora do celular um pouco adiantada', async () => {
    const adiantado = new Date(Date.now() + 2 * 60 * 1000).toISOString()
    await request(app.getHttpServer()).post('/casos').send(casoValido({ ocorridoEm: adiantado })).expect(201)
  })

  it('recusa telefone do autor fora do padrão com a mensagem padronizada', async () => {
    const res = await request(app.getHttpServer())
      .post('/casos')
      .send(casoValido({ autor: { nome: 'Autor', telefone: '123' } }))
      .expect(400)
    expect(res.body.message.some((m: string) => m.includes('Telefone com DDD: 10 ou 11 dígitos'))).toBe(true)
  })

  it('aceita idCliente e codigoEdicao válidos juntos', async () => {
    const idCliente = 'c4e433a0-1234-4b56-8a90-123456789abc'
    const codigoEdicao = '2345-6789'
    await request(app.getHttpServer())
      .post('/casos')
      .send(casoValido({ idCliente, codigoEdicao }))
      .expect(201)
  })

  describe('texto público sem contato (RNF4)', () => {
    it.each([
      ['telefone no relato', { relato: 'Quem achar liga 93 99123-4567 por favor' }],
      ['whatsapp no relato', { relato: 'Chame no zap para combinar' }],
      ['link no relato', { relato: 'Fotos do animal em https://meucachorro.com' }],
      ['telefone no enunciado da pergunta', { perguntas: [{ enunciado: 'Ligue 93991234567?', respostaEsperada: 'sim' }, pergunta, pergunta] }],
      ['link wa.me no enunciado da pergunta', { perguntas: [{ enunciado: 'Mande msg em wa.me/5593991234567', respostaEsperada: 'ok' }, pergunta, pergunta] }],
    ])('recusa %s e explica que o contato é liberado pelo app', async (_motivo, alteracao) => {
      const res = await request(app.getHttpServer()).post('/casos').send(casoValido(alteracao)).expect(400)
      const mensagens = Array.isArray(res.body.message) ? res.body.message.join(' ') : String(res.body.message)
      expect(mensagens).toMatch(/contato/i)
      expect(await prisma.caso.count()).toBe(0)
    })
  })
})
