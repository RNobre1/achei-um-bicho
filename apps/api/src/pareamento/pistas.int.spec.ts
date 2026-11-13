import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'
import { aoSul, CENTRO_SANTAREM, distanciaEntre } from '../../test/pontos'

const UM_DIA = 24 * 60 * 60 * 1000

const CHAVES_PROIBIDAS = ['telefone', 'email', 'codigoEdicao', 'respostaEsperada', 'autor', 'autorId', 'ponto', 'latitude', 'longitude']

function chaves(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.flatMap(chaves)
  if (valor && typeof valor === 'object') {
    return Object.entries(valor).flatMap(([chave, filho]) => [chave, ...chaves(filho)])
  }
  return []
}

function encontrado(metros: number, animal: Record<string, unknown> = {}) {
  const base = casoValido()
  return casoValido({
    tipo: 'encontrado',
    animal: { ...base.animal, nome: undefined, castrado: undefined, ...animal },
    local: { ...base.local, ...aoSul(CENTRO_SANTAREM, metros), bairro: 'Santa Clara' },
    autor: { nome: 'Quem achou', telefone: '93998887777' },
    ocorridoEm: new Date(Date.now() - UM_DIA).toISOString(),
  })
}

describe('pistas de pareamento', () => {
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

  async function publicar(corpo: Record<string, unknown>): Promise<{ id: string; codigoEdicao: string }> {
    const { body } = await request(app.getHttpServer()).post('/casos').send(corpo).expect(201)
    return body
  }

  function pistas(casoId: string, codigo?: string) {
    const pedido = request(app.getHttpServer()).get(`/casos/${casoId}/pistas`)
    if (codigo) pedido.set('x-codigo-edicao', codigo)
    return pedido
  }

  function descartar(casoId: string, pistaId: string, codigo: string, corpo: Record<string, unknown> = { veredito: 'descartado' }) {
    return request(app.getHttpServer())
      .post(`/casos/${casoId}/pistas/${pistaId}/veredito`)
      .set('x-codigo-edicao', codigo)
      .send(corpo)
  }

  describe('GET /casos/:id/pistas', () => {
    it('mostra a quem perdeu o caso achado do outro lado, com o que bateu e o que não bateu', async () => {
      const nego = await publicar(casoValido({ ocorridoEm: new Date(Date.now() - 2 * UM_DIA).toISOString() }))
      const achado = await publicar(encontrado(850, { coleira: 'sem' }))

      const { body } = await pistas(nego.id, nego.codigoEdicao).expect(200)

      expect(body).toHaveLength(1)
      expect(body[0]).toMatchObject({
        id: expect.any(String),
        veredito: 'pendente',
        diasDiferenca: 1,
        outro: {
          id: achado.id,
          tipo: 'encontrado',
          bairro: 'Santa Clara',
          animal: { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'sem', nome: null },
          foto: null,
        },
      })
      expect(body[0].batem.map((c: { atributo: string }) => c.atributo)).toEqual(['porte', 'cor', 'distancia', 'tempo'])
      expect(body[0].divergem).toEqual([{ atributo: 'coleira', perdido: 'com', encontrado: 'sem' }])
    })

    it('a distância da pista é entre os centros publicados, para três casos falsos não acharem o ponto real', async () => {
      const nego = await publicar(casoValido())
      const achado = await publicar(encontrado(850))
      const area = async (id: string) => (await request(app.getHttpServer()).get(`/casos/${id}`).expect(200)).body.area
      const [a, b] = [await area(nego.id), await area(achado.id)]
      const entreCentros = distanciaEntre(a, b)

      const { body } = await pistas(nego.id, nego.codigoEdicao).expect(200)

      expect(Math.abs(body[0].distanciaM - entreCentros)).toBeLessThanOrEqual(2)
      const distancia = [...body[0].batem, ...body[0].divergem].find((c: { atributo: string }) => c.atributo === 'distancia')
      expect(distancia.metros).toBe(body[0].distanciaM)
    })

    it('mostra o mesmo par a quem achou, com o caso perdido do outro lado', async () => {
      const nego = await publicar(casoValido())
      const achado = await publicar(encontrado(850))

      const { body } = await pistas(achado.id, achado.codigoEdicao).expect(200)

      expect(body[0].outro).toMatchObject({ id: nego.id, tipo: 'perdido', animal: { nome: 'Nego' } })
    })

    it('põe primeiro o par com mais coincidências', async () => {
      const nego = await publicar(casoValido())
      const parecido = await publicar(encontrado(1200))
      const diferente = await publicar(encontrado(300, { porte: 'grande', corDominante: 'malhado' }))

      const { body } = await pistas(nego.id, nego.codigoEdicao).expect(200)

      expect(body.map((p: { outro: { id: string } }) => p.outro.id)).toEqual([parecido.id, diferente.id])
    })

    it('não entrega contato, código, respostas nem o ponto de nenhum dos lados', async () => {
      const nego = await publicar(casoValido())
      await publicar(encontrado(850))

      const { body } = await pistas(nego.id, nego.codigoEdicao).expect(200)

      for (const proibida of CHAVES_PROIBIDAS) expect(chaves(body)).not.toContain(proibida)
      expect(JSON.stringify(body)).not.toContain('93998887777')
    })

    it('só mostra pistas cujo outro caso está vigiado', async () => {
      const nego = await publicar(casoValido())
      const achado1 = await publicar(encontrado(850))
      const achado2 = await publicar(encontrado(900))

      // Muda o achado2 para expirado (não vigiado)
      await prisma.caso.update({ where: { id: achado2.id }, data: { estado: 'expirado' } })

      const { body } = await pistas(nego.id, nego.codigoEdicao).expect(200)

      expect(body).toHaveLength(1)
      expect(body[0].outro.id).toBe(achado1.id)
    })

    it('só quem publicou vê as pistas', async () => {
      const nego = await publicar(casoValido())
      const achado = await publicar(encontrado(850))

      await pistas(nego.id).expect(403)
      await pistas(nego.id, achado.codigoEdicao).expect(403)
    })

    it('responde 404 para caso que não existe', async () => {
      await pistas(randomUUID(), 'ABCD-EFGH').expect(404)
    })
  })

  describe('POST /casos/:id/pistas/:pistaId/veredito', () => {
    it('"Não é" descarta o par, que some para os dois lados', async () => {
      const nego = await publicar(casoValido())
      const achado = await publicar(encontrado(850))
      const [pista] = (await pistas(nego.id, nego.codigoEdicao)).body

      const { body } = await descartar(nego.id, pista.id, nego.codigoEdicao).expect(200)

      expect(body).toEqual({ id: pista.id, veredito: 'descartado' })
      expect((await pistas(nego.id, nego.codigoEdicao)).body).toEqual([])
      expect((await pistas(achado.id, achado.codigoEdicao)).body).toEqual([])
      const par = await prisma.pareamento.findUniqueOrThrow({ where: { id: pista.id } })
      expect(par.decididoEm).not.toBeNull()
    })

    it('não aceita confirmar por aqui: confirmação vem com a verificação', async () => {
      const nego = await publicar(casoValido())
      await publicar(encontrado(850))
      const [pista] = (await pistas(nego.id, nego.codigoEdicao)).body

      await descartar(nego.id, pista.id, nego.codigoEdicao, { veredito: 'confirmado' }).expect(400)
    })

    it('não deixa decidir sobre par de outro caso', async () => {
      const nego = await publicar(casoValido())
      await publicar(encontrado(850))
      const outroPerdido = await publicar(casoValido({ local: { ...casoValido().local, ...aoSul(CENTRO_SANTAREM, 30_000) } }))
      const [pista] = (await pistas(nego.id, nego.codigoEdicao)).body

      await descartar(outroPerdido.id, pista.id, outroPerdido.codigoEdicao).expect(404)
    })

    it('recusa quem não tem o código do caso', async () => {
      const nego = await publicar(casoValido())
      const achado = await publicar(encontrado(850))
      const [pista] = (await pistas(nego.id, nego.codigoEdicao)).body

      await descartar(nego.id, pista.id, achado.codigoEdicao).expect(403)
    })

    it('renova a última interação e zera cobrado_em do caso do autor', async () => {
      const nego = await publicar(casoValido())
      await publicar(encontrado(850))
      const [pista] = (await pistas(nego.id, nego.codigoEdicao)).body

      await prisma.$executeRaw`UPDATE caso SET ultima_interacao_em = now() - interval '8 days', cobrado_em = now() - interval '2 days' WHERE id = ${nego.id}::uuid`

      await descartar(nego.id, pista.id, nego.codigoEdicao).expect(200)

      const caso = await prisma.caso.findUniqueOrThrow({ where: { id: nego.id } })
      expect(caso.cobradoEm).toBeNull()
      expect(Date.now() - caso.ultimaInteracaoEm.getTime()).toBeLessThan(60_000)
    })

    it('recusa veredito com 409 quando o caso não é vigiado', async () => {
      const nego = await publicar(casoValido())
      await publicar(encontrado(850))
      const [pista] = (await pistas(nego.id, nego.codigoEdicao)).body

      await prisma.caso.update({ where: { id: nego.id }, data: { estado: 'expirado' } })

      await descartar(nego.id, pista.id, nego.codigoEdicao).expect(409)
    })
  })
})
