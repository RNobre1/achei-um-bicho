import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { limparBanco } from '../../test/limpar-banco'
import { CENTRO_SANTAREM } from '../../test/pontos'

const CHAVES_PROIBIDAS = [
  'telefone',
  'email',
  'senhaHash',
  'codigoEdicao',
  'respostaEsperada',
  'autor',
  'autorId',
  'localId',
  'animalId',
  'ponto',
]

function chaves(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.flatMap(chaves)
  if (valor && typeof valor === 'object') {
    return Object.entries(valor).flatMap(([chave, filho]) => [chave, ...chaves(filho)])
  }
  return []
}

describe('RNF4: proteção contra vazamento de dados pessoais e sensíveis em rotas públicas', () => {
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

  it('nenhuma rota pública contém telefone, resposta esperada, código ou ponto exato', async () => {
    const telefoneAutor = '93991234567'
    const telefoneReivindicante = '93998881122'
    const respostaSecreta = 'Falta um pedaço da orelha esquerda'

    // Publica o caso
    const { body: caso } = await request(app.getHttpServer())
      .post('/casos')
      .send(casoValido({ autor: { nome: 'Tutor Autor', telefone: telefoneAutor } }))
      .expect(201)

    // Obtém perguntas públicas
    const { body: perguntas } = await request(app.getHttpServer())
      .get(`/casos/${caso.id}/perguntas`)
      .expect(200)

    // Registra reivindicação
    const { body: reiv } = await request(app.getHttpServer())
      .post(`/casos/${caso.id}/reivindicacoes`)
      .send({
        respostas: perguntas.map((p: { id: string }) => ({ perguntaId: p.id, texto: 'resposta dada' })),
        pessoa: { nome: 'Reivindicante Teste', telefone: telefoneReivindicante, referencia: 'Perto de casa' },
      })
      .expect(201)

    // 1. Mural
    const { body: mural } = await request(app.getHttpServer())
      .get(`/casos?latitude=${CENTRO_SANTAREM.latitude}&longitude=${CENTRO_SANTAREM.longitude}`)
      .expect(200)

    // 2. Caso aberto
    const { body: casoAberto } = await request(app.getHttpServer())
      .get(`/casos/${caso.id}`)
      .expect(200)

    // 3. Perguntas públicas
    const { body: perguntasPublicas } = await request(app.getHttpServer())
      .get(`/casos/${caso.id}/perguntas`)
      .expect(200)

    // 4. Situação da reivindicação antes do aceite
    const { body: situacao } = await request(app.getHttpServer())
      .get(`/reivindicacoes/${reiv.id}`)
      .set('x-codigo-acompanhamento', reiv.codigoAcompanhamento)
      .expect(200)

    const respostasPublicas = [mural, casoAberto, perguntasPublicas, situacao]

    for (const corpo of respostasPublicas) {
      const listaChaves = chaves(corpo)
      for (const proibida of CHAVES_PROIBIDAS) {
        expect(listaChaves, `corpo não pode conter chave "${proibida}"`).not.toContain(proibida)
      }

      const serializado = JSON.stringify(corpo)
      expect(serializado).not.toContain(telefoneAutor)
      expect(serializado).not.toContain(telefoneReivindicante)
      expect(serializado).not.toContain(respostaSecreta)
      expect(serializado).not.toContain(caso.codigoEdicao)
      expect(serializado).not.toContain(reiv.codigoAcompanhamento)
      expect(serializado).not.toContain(String(CENTRO_SANTAREM.latitude))
      expect(serializado).not.toContain(String(CENTRO_SANTAREM.longitude))
    }
  })
})
