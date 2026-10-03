import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'
import { aoSul, CENTRO_SANTAREM } from '../../test/pontos'

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
  })
})
