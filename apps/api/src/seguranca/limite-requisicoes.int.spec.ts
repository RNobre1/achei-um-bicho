import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'

describe('limite de requisições por IP (rate limiting)', () => {
  let app: INestApplication
  const prisma = new PrismaClient()
  const ambienteOriginal = { ...process.env }

  beforeAll(async () => {
    // Configura limites baixos para o teste de taxa
    process.env.LIMITE_LEITURA_POR_MINUTO = '5'
    process.env.LIMITE_ESCRITA_POR_MINUTO = '3'
    app = await criarAppDeTeste()
  })

  beforeEach(async () => {
    await limparBanco(prisma)
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
    process.env = ambienteOriginal
  })

  it('responde 429 quando o limite de escrita do mesmo IP é excedido', async () => {
    const ip = '198.51.100.1'

    // Limite é 3: as primeiras 3 requisições de escrita passam
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post('/casos')
        .set('X-Forwarded-For', ip)
        .send(casoValido())
        .expect(201)
    }

    // A 4ª requisição deve ser barrada com 429
    const resposta = await request(app.getHttpServer())
      .post('/casos')
      .set('X-Forwarded-For', ip)
      .send(casoValido())

    expect(resposta.status).toBe(429)
  })

  it('dois IPs diferentes têm baldes separados', async () => {
    const ipA = '198.51.100.10'
    const ipB = '198.51.100.20'

    // Esgota o balde de escrita do IP A (3 requisições)
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post('/casos')
        .set('X-Forwarded-For', ipA)
        .send(casoValido())
        .expect(201)
    }

    // IP A toma 429
    await request(app.getHttpServer())
      .post('/casos')
      .set('X-Forwarded-For', ipA)
      .send(casoValido())
      .expect(429)

    // IP B ainda tem balde cheio e consegue publicar normalmente
    await request(app.getHttpServer())
      .post('/casos')
      .set('X-Forwarded-For', ipB)
      .send(casoValido())
      .expect(201)
  })

  it('balde de leitura é separado do balde de escrita', async () => {
    const ip = '198.51.100.30'

    // Esgota a escrita do IP
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post('/casos')
        .set('X-Forwarded-For', ip)
        .send(casoValido())
        .expect(201)
    }

    // Escrita bloqueada
    await request(app.getHttpServer())
      .post('/casos')
      .set('X-Forwarded-For', ip)
      .send(casoValido())
      .expect(429)

    // Leitura (GET /casos) continua permitida, pois o balde de leitura é separado
    await request(app.getHttpServer())
      .get('/casos?latitude=-2.44&longitude=-54.71')
      .set('X-Forwarded-For', ip)
      .expect(200)
  })

  it('rotas de /saude e /tarefas/* são exceção ao limite', async () => {
    const ip = '198.51.100.40'

    // Chama /saude mais vezes que o limite de leitura (5)
    for (let i = 0; i < 8; i++) {
      await request(app.getHttpServer())
        .get('/saude')
        .set('X-Forwarded-For', ip)
        .expect(200)
    }
  })
})
