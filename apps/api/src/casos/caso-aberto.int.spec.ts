import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'
import { CENTRO_SANTAREM } from '../../test/pontos'

const CHAVES_PROIBIDAS = [
  'telefone', 'email', 'senhaHash', 'codigoEdicao', 'respostaEsperada',
  'autor', 'autorId', 'localId', 'animalId', 'ponto',
]

/** Todas as chaves de um objeto, em qualquer profundidade. */
function chaves(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.flatMap(chaves)
  if (valor && typeof valor === 'object') {
    return Object.entries(valor).flatMap(([chave, filho]) => [chave, ...chaves(filho)])
  }
  return []
}

describe('GET /casos/:id (caso aberto)', () => {
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

  async function publicar(): Promise<string> {
    const { body } = await request(app.getHttpServer()).post('/casos').send(casoValido()).expect(201)
    return body.id
  }

  it('mostra o animal, o relato e a área aproximada de onde foi visto', async () => {
    const id = await publicar()

    const { body } = await request(app.getHttpServer()).get(`/casos/${id}`).expect(200)

    expect(body).toMatchObject({
      id,
      tipo: 'perdido',
      estado: 'procurando',
      relato: 'Sumiu no fim da tarde de sábado, quando o portão ficou aberto.',
      animal: { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'com', nome: 'Nego', castrado: true },
      area: { bairro: 'Aparecida', raioM: 300 },
    })
    expect(body.ocorridoEm).toEqual(expect.any(String))
    expect(body.publicadoEm).toEqual(expect.any(String))
  })

  it('não entrega contato, código de edição, respostas nem ids internos', async () => {
    const id = await publicar()
    const { body } = await request(app.getHttpServer()).get(`/casos/${id}`).expect(200)

    const presentes = chaves(body)
    for (const proibida of CHAVES_PROIBIDAS) {
      expect(presentes, `a resposta não pode ter "${proibida}"`).not.toContain(proibida)
    }
    expect(JSON.stringify(body)).not.toContain('93991234567')
  })

  it('publica um centro deslocado do ponto real, e sempre o mesmo', async () => {
    const id = await publicar()
    const primeira = await request(app.getHttpServer()).get(`/casos/${id}`).expect(200)
    const segunda = await request(app.getHttpServer()).get(`/casos/${id}`).expect(200)

    expect(primeira.body.area).toEqual(segunda.body.area)
    expect(primeira.body.area.latitude).not.toBe(CENTRO_SANTAREM.latitude)
    expect(primeira.body.area.longitude).not.toBe(CENTRO_SANTAREM.longitude)
  })

  it('responde 404 para caso que não existe', async () => {
    await request(app.getHttpServer()).get(`/casos/${randomUUID()}`).expect(404)
  })

  it('responde 400 para identificador que não é uuid', async () => {
    await request(app.getHttpServer()).get('/casos/nego').expect(400)
  })
})
