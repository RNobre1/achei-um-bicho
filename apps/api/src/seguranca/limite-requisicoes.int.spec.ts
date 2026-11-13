import { Controller, Get, type INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'

@Controller()
class ControladorTesteTarefas {
  @Get('tarefas/ciclo-de-vida')
  ciclo() {
    return { ok: true }
  }

  @Get('tarefasXYZ')
  xyz() {
    return { ok: true }
  }
}

describe('limite de requisições por IP (rate limiting)', () => {
  let app: INestApplication
  const prisma = new PrismaClient()
  const ambienteOriginal = { ...process.env }

  beforeAll(async () => {
    // Configura limites baixos para o teste de taxa
    process.env.LIMITE_LEITURA_POR_MINUTO = '5'
    process.env.LIMITE_ESCRITA_POR_MINUTO = '3'
    process.env.LIMITE_FOTOS_POR_MINUTO = '10'
    process.env.SALTOS_DE_PROXY = '1'
    app = await criarAppDeTeste([ControladorTesteTarefas])
  })

  beforeEach(async () => {
    await limparBanco(prisma)
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
    process.env = ambienteOriginal
  })

  it('responde 429 com mensagem em português quando o limite de escrita do mesmo IP é excedido', async () => {
    const ip = '198.51.100.1'

    // Limite é 3: as primeiras 3 requisições de escrita passam
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post('/casos')
        .set('X-Forwarded-For', ip)
        .send(casoValido())
        .expect(201)
    }

    // A 4ª requisição deve ser barrada com 429 e corpo com mensagem amigável
    const resposta = await request(app.getHttpServer())
      .post('/casos')
      .set('X-Forwarded-For', ip)
      .send(casoValido())

    expect(resposta.status).toBe(429)
    expect(resposta.body.message).toBe('Muitas tentativas em pouco tempo. Espere um minuto e tente de novo.')
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

  it('fotos ganham balde próprio e não gastam o balde do mural', async () => {
    const ip = '198.51.100.35'

    // Faz 6 requisições de fotos (acima do limite de leitura geral 5, mas abaixo de 10 de fotos)
    for (let i = 0; i < 6; i++) {
      await request(app.getHttpServer())
        .get(`/fotos/00000000-0000-0000-0000-00000000000${i}.jpg`)
        .set('X-Forwarded-For', ip)
    }

    // O balde de leitura do mural permanece intocado para este IP
    await request(app.getHttpServer())
      .get('/casos?latitude=-2.44&longitude=-54.71')
      .set('X-Forwarded-For', ip)
      .expect(200)
  })

  it('rotas de /saude e /tarefas/* são exceção ao limite, mas /tarefasXYZ não é', async () => {
    const ip = '198.51.100.40'

    // Chama /saude com query string mais vezes que o limite de leitura (5)
    for (let i = 0; i < 8; i++) {
      await request(app.getHttpServer())
        .get('/saude?x=1')
        .set('X-Forwarded-For', ip)
        .expect(200)
    }

    // Chama /tarefas/ciclo-de-vida mais vezes que o limite de leitura (5)
    for (let i = 0; i < 8; i++) {
      await request(app.getHttpServer())
        .get('/tarefas/ciclo-de-vida')
        .set('X-Forwarded-For', ip)
        .expect(200)
    }

    // Mas /tarefasXYZ não é isenta: após 5 chamadas, deve tomar 429
    const ipNaoIsento = '198.51.100.41'
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .get('/tarefasXYZ')
        .set('X-Forwarded-For', ipNaoIsento)
        .expect(200)
    }
    await request(app.getHttpServer())
      .get('/tarefasXYZ')
      .set('X-Forwarded-For', ipNaoIsento)
      .expect(429)
  })

  it('com trust proxy de 1 salto, forjar X-Forwarded-For não escapa do limite do IP real', async () => {
    const ipReal = '198.51.100.50'

    // Realiza 3 escritas com X-Forwarded-For forjado: primeiro IP é falso, o da direita é o real
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post('/casos')
        .set('X-Forwarded-For', `1.1.1.${i}, ${ipReal}`)
        .send(casoValido())
        .expect(201)
    }

    // Trocar o primeiro IP não escapa do limite porque o IP real é o avaliado pelo salto
    await request(app.getHttpServer())
      .post('/casos')
      .set('X-Forwarded-For', `9.9.9.9, ${ipReal}`)
      .send(casoValido())
      .expect(429)
  })
})

describe('limite de requisições atrás do Cloudflare (CABECALHO_IP_CLIENTE)', () => {
  let app: INestApplication
  const ambienteOriginal = { ...process.env }

  beforeAll(async () => {
    process.env.LIMITE_LEITURA_POR_MINUTO = '5'
    process.env.CABECALHO_IP_CLIENTE = 'cf-connecting-ip'
    app = await criarAppDeTeste()
  })

  afterAll(async () => {
    await app.close()
    process.env = ambienteOriginal
  })

  it('conta pelo IP que o Cloudflare informa, mesmo com a conexão vinda de proxies diferentes', async () => {
    const consultar = (ipCliente: string, ipProxy: string) =>
      request(app.getHttpServer())
        .get('/casos')
        .query({ latitude: -2.4385, longitude: -54.7085 })
        .set('cf-connecting-ip', ipCliente)
        .set('x-forwarded-for', ipProxy)

    for (let i = 0; i < 5; i++) await consultar('200.1.1.1', `172.64.0.${i}`).expect(200)
    await consultar('200.1.1.1', '172.64.0.99').expect(429)
    await consultar('200.2.2.2', '172.64.0.99').expect(200)
  })
})
