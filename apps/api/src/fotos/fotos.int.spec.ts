import { randomUUID } from 'node:crypto'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import type { INestApplication } from '@nestjs/common'
import { FOTO } from '@achei/contratos'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { criarAppDeTeste } from '../../test/app-de-teste'
import { casoValido } from '../../test/fabricas'
import { jpegDeTeste } from '../../test/jpeg-de-teste'
import { limparBanco } from '../../test/limpar-banco'
import { CENTRO_SANTAREM } from '../../test/pontos'

const PASTA = process.env.PASTA_FOTOS!

function fotosNaPasta(): string[] {
  return existsSync(PASTA) ? readdirSync(PASTA) : []
}

describe('fotos do animal', () => {
  let app: INestApplication
  const prisma = new PrismaClient()

  beforeAll(async () => {
    app = await criarAppDeTeste()
  })

  beforeEach(async () => {
    await limparBanco(prisma)
    rmSync(PASTA, { recursive: true, force: true })
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  async function publicar(): Promise<{ id: string; codigoEdicao: string }> {
    const { body } = await request(app.getHttpServer()).post('/casos').send(casoValido()).expect(201)
    return body
  }

  function enviar(casoId: string, codigo: string | undefined, arquivo: Buffer = jpegDeTeste(), tipo = 'image/jpeg') {
    const pedido = request(app.getHttpServer()).post(`/casos/${casoId}/fotos`)
    if (codigo) pedido.set('x-codigo-edicao', codigo)
    return pedido.attach('foto', arquivo, { filename: 'foto.jpg', contentType: tipo })
  }

  function baixar(caminho: string) {
    return request(app.getHttpServer())
      .get(caminho)
      .buffer(true)
      .parse((resposta, pronto) => {
        const pedacos: Buffer[] = []
        resposta.on('data', (pedaco: Buffer) => pedacos.push(pedaco))
        resposta.on('end', () => pronto(null, Buffer.concat(pedacos)))
      })
  }

  it('guarda a foto de quem publicou e devolve o caminho público', async () => {
    const { id, codigoEdicao } = await publicar()

    const { body } = await enviar(id, codigoEdicao).expect(201)

    expect(body).toEqual({ id: expect.any(String), caminho: `/fotos/${body.id}.jpg` })
    const gravada = await prisma.foto.findUniqueOrThrow({ where: { id: body.id } })
    expect(gravada).toMatchObject({ caminho: body.caminho, largura: 800, altura: 600 })
  })

  it('serve a foto sem os metadados em que o celular grava a localização', async () => {
    const { id, codigoEdicao } = await publicar()
    const { body } = await enviar(id, codigoEdicao).expect(201)

    const resposta = await baixar(body.caminho).expect(200)

    expect(resposta.headers['content-type']).toBe('image/jpeg')
    expect((resposta.body as Buffer).toString('latin1')).not.toContain('GPS')
    expect((resposta.body as Buffer).toString('latin1')).toContain('JFIF')
  })

  it('a foto aparece no mural e no caso aberto', async () => {
    const { id, codigoEdicao } = await publicar()
    const { body: foto } = await enviar(id, codigoEdicao).expect(201)

    const mural = await request(app.getHttpServer()).get('/casos').query(CENTRO_SANTAREM).expect(200)
    const aberto = await request(app.getHttpServer()).get(`/casos/${id}`).expect(200)

    expect(mural.body.casos[0].foto).toBe(foto.caminho)
    expect(aberto.body.fotos).toEqual([foto.caminho])
  })

  it('caso sem foto sai com foto nula no mural e lista vazia no caso aberto', async () => {
    const { id } = await publicar()

    const mural = await request(app.getHttpServer()).get('/casos').query(CENTRO_SANTAREM).expect(200)
    const aberto = await request(app.getHttpServer()).get(`/casos/${id}`).expect(200)

    expect(mural.body.casos[0].foto).toBeNull()
    expect(aberto.body.fotos).toEqual([])
  })

  it('recusa quem não mostra o código de edição do caso', async () => {
    const { id } = await publicar()
    const outro = await publicar()

    await enviar(id, undefined).expect(403)
    await enviar(id, outro.codigoEdicao).expect(403)
    expect(fotosNaPasta()).toEqual([])
  })

  it('recusa arquivo que não é JPEG', async () => {
    const { id, codigoEdicao } = await publicar()
    await enviar(id, codigoEdicao, Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'), 'image/png').expect(400)
    expect(await prisma.foto.count()).toBe(0)
  })

  it('recusa envio sem arquivo', async () => {
    const { id, codigoEdicao } = await publicar()
    await request(app.getHttpServer()).post(`/casos/${id}/fotos`).set('x-codigo-edicao', codigoEdicao).expect(400)
  })

  it('recusa foto acima do limite, que já devia ter sido reduzida no aparelho', async () => {
    const { id, codigoEdicao } = await publicar()
    const grande = Buffer.concat([jpegDeTeste(), Buffer.alloc(FOTO.maximoBytes)])
    await enviar(id, codigoEdicao, grande).expect(413)
    expect(fotosNaPasta()).toEqual([])
  })

  it(`não passa de ${FOTO.maximoPorCaso} fotos por caso`, async () => {
    const { id, codigoEdicao } = await publicar()
    for (let i = 0; i < FOTO.maximoPorCaso; i++) await enviar(id, codigoEdicao).expect(201)

    await enviar(id, codigoEdicao).expect(409)
    expect(await prisma.foto.count()).toBe(FOTO.maximoPorCaso)
  })

  it('responde 404 para caso que não existe', async () => {
    await enviar(randomUUID(), 'ABCD-EFGH').expect(404)
  })

  it('não serve nada fora da pasta de fotos nem foto que não existe', async () => {
    await request(app.getHttpServer()).get('/fotos/..%2F..%2Fpackage.json').expect(404)
    await request(app.getHttpServer()).get(`/fotos/${randomUUID()}.jpg`).expect(404)
  })
})
