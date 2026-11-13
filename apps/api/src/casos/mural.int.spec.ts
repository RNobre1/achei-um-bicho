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
    const medio = await publicarA(1300, 'encontrado', 'Santa Clara')
    await publicarA(3000, 'perdido', 'Diamantino')

    const { body } = await request(app.getHttpServer()).get('/casos').query(centro).expect(200)

    expect(body.raioM).toBe(1600)
    expect(body.casos.map((c: { id: string }) => c.id)).toEqual([perto, medio])
    // a distância é até o centro publicado, que fica a até 225 m do ponto real
    expect(Math.abs(body.casos[0].distanciaM - 500)).toBeLessThanOrEqual(225)
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
    await publicarA(1300, 'encontrado')
    await publicarA(3000)

    const amplo = await request(app.getHttpServer()).get('/casos').query({ ...centro, raio: 5000 }).expect(200)
    expect(amplo.body.casos).toHaveLength(3)

    const achados = await request(app.getHttpServer())
      .get('/casos')
      .query({ ...centro, raio: 5000, tipo: 'encontrado' })
      .expect(200)
    expect(achados.body.casos.map((c: { tipo: string }) => c.tipo)).toEqual(['encontrado'])
  })

  describe('usa só o centro publicado, nunca o ponto real', () => {
    const M_LAT = 110_574
    const mLon = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180)
    /** Ponto a `metros` do ponto real, do lado oposto ao do centro publicado. */
    function doLadoOposto(real: { latitude: number; longitude: number }, publicado: typeof real, metros: number) {
      const dy = (publicado.latitude - real.latitude) * M_LAT
      const dx = (publicado.longitude - real.longitude) * mLon(real.latitude)
      const d = Math.hypot(dx, dy)
      return {
        latitude: real.latitude - ((dy / d) * metros) / M_LAT,
        longitude: real.longitude - ((dx / d) * metros) / mLon(real.latitude),
      }
    }
    function distancia(a: { latitude: number; longitude: number }, b: typeof a) {
      return Math.hypot((a.latitude - b.latitude) * M_LAT, (a.longitude - b.longitude) * mLon(a.latitude))
    }

    async function publicarEmCentro() {
      const id = await publicarA(0)
      const { body } = await request(app.getHttpServer()).get(`/casos/${id}`).expect(200)
      return { id, real: aoSul(CENTRO_SANTAREM, 0), publicado: { latitude: body.area.latitude, longitude: body.area.longitude } }
    }

    it('a distância devolvida é até o centro publicado', async () => {
      const { real, publicado } = await publicarEmCentro()
      const consulta = doLadoOposto(real, publicado, 500)
      const { body } = await request(app.getHttpServer()).get('/casos').query(consulta).expect(200)
      expect(Math.abs(body.casos[0].distanciaM - distancia(consulta, publicado))).toBeLessThanOrEqual(2)
      expect(Math.abs(body.casos[0].distanciaM - distancia(consulta, real))).toBeGreaterThan(50)
    })

    it('entra no raio e na contagem pelo centro publicado: ponto real dentro e centro fora não aparece', async () => {
      const { real, publicado } = await publicarEmCentro()
      const noRaio = await request(app.getHttpServer()).get('/casos').query(doLadoOposto(real, publicado, 1550)).expect(200)
      expect(noRaio.body.casos).toEqual([])

      const noMaximo = await request(app.getHttpServer()).get('/casos').query(doLadoOposto(real, publicado, 4950)).expect(200)
      expect(noMaximo.body.totalNoRaioMaximo).toBe(0)
    })
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
