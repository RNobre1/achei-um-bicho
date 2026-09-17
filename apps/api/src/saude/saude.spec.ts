import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, it } from 'vitest'
import { SaudeModule } from './saude.module'

describe('GET /saude', () => {
  let app: INestApplication

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [SaudeModule] }).compile()
    app = modulo.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('responde que a API está de pé', async () => {
    await request(app.getHttpServer()).get('/saude').expect(200).expect({ status: 'ok' })
  })
})
