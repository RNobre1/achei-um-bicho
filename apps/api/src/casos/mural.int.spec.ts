import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'
import { aoSul, CENTRO_SANTAREM } from '../../test/pontos'

describe('GET /casos (mural por proximidade)', () => {
  let app: INestApplication
  const prisma = new PrismaClient()
  const centro = { latitude: CENTRO_SANTAREM.latitude, longitude: CENTRO_SANTAREM.longitude }

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

  async function publicarA(metros: number, tipo = 'perdido', bairro = 'Aparecida'): Promise<string> {
    const ponto = aoSul(CENTRO_SANTAREM, metros)
    const { body } = await request(app.getHttpServer())
      .post('/casos')
      .send(casoValido({ tipo, local: { ...ponto, bairro } }))
      .expect(201)
    return body.id
  }

  it('mostra só o que está no raio padrão de 1,6 km, do mais perto para o mais longe', async () => {
    const perto = await publicarA(500)
    const medio = await publicarA(1500, 'encontrado', 'Santa Clara')
    await publicarA(3000, 'perdido', 'Diamantino')

    const { body } = await request(app.getHttpServer()).get('/casos').query(centro).expect(200)

    expect(body.raioM).toBe(1600)
    expect(body.casos.map((c: { id: string }) => c.id)).toEqual([perto, medio])
    expect(body.casos[0].distanciaM).toBeCloseTo(500, -1)
    expect(body.casos[1]).toMatchObject({
      tipo: 'encontrado',
      estado: 'abrigado_temporariamente',
      bairro: 'Santa Clara',
      animal: { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'com', nome: 'Nego' },
    })
  })

  it('diz quantos casos existem no raio máximo, para o mural vazio oferecer ampliar', async () => {
    await publicarA(3000)
    await publicarA(4500)

    const { body } = await request(app.getHttpServer()).get('/casos').query(centro).expect(200)

    expect(body.casos).toEqual([])
    expect(body.totalNoRaioMaximo).toBe(2)
  })

  it('amplia quando o raio aumenta e filtra por lado do caso', async () => {
    await publicarA(500)
    await publicarA(1500, 'encontrado')
    await publicarA(3000)

    const amplo = await request(app.getHttpServer()).get('/casos').query({ ...centro, raio: 5000 }).expect(200)
    expect(amplo.body.casos).toHaveLength(3)

    const achados = await request(app.getHttpServer())
      .get('/casos')
      .query({ ...centro, raio: 5000, tipo: 'encontrado' })
      .expect(200)
    expect(achados.body.casos.map((c: { tipo: string }) => c.tipo)).toEqual(['encontrado'])
  })

  it('não mostra caso resolvido nem expirado', async () => {
    const resolvido = await publicarA(300)
    await prisma.caso.update({ where: { id: resolvido }, data: { estado: 'resolvido' } })

    const { body } = await request(app.getHttpServer()).get('/casos').query(centro).expect(200)
    expect(body.casos).toEqual([])
  })

  it('não entrega contato, código de edição nem coordenada exata', async () => {
    await publicarA(500)
    const { body } = await request(app.getHttpServer()).get('/casos').query(centro).expect(200)
    const texto = JSON.stringify(body)
    for (const proibido of ['telefone', 'codigoEdicao', 'respostaEsperada', 'latitude', 'longitude', 'autor']) {
      expect(texto).not.toContain(proibido)
    }
  })

  it.each([
    ['raio acima do máximo', { ...centro, raio: 10000 }],
    ['raio abaixo do mínimo', { ...centro, raio: 100 }],
    ['sem latitude', { longitude: centro.longitude }],
    ['tipo inexistente', { ...centro, tipo: 'sumido' }],
  ])('recusa consulta com %s', async (_motivo, consulta) => {
    await request(app.getHttpServer()).get('/casos').query(consulta).expect(400)
  })
})
