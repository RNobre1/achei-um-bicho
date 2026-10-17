import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { limparBanco } from '../../test/limpar-banco'

const TABELAS = [
  'pessoa', 'animal', 'foto', 'local', 'caso', 'avistamento', 'pergunta_verificacao',
  'tentativa_verificacao', 'resposta_verificacao', 'pareamento', 'desfecho', 'denuncia',
]

/**
 * Confere o banco contra o esquema físico do documento "Modelo Entidade-Relacionamento".
 * Se este teste falhar, quem está errado é o código, não o documento entregue.
 */
describe('o banco segue o modelo ER documentado', () => {
  const prisma = new PrismaClient()

  beforeEach(async () => {
    await limparBanco(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  async function criarCaso(): Promise<string> {
    const [pessoa] = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO pessoa (nome) VALUES ('Tutor de teste') RETURNING id`
    const [animal] = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO animal (especie, porte, cor_dominante, coleira)
      VALUES ('cachorro', 'medio', 'caramelo', 'com') RETURNING id`
    const [local] = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO local (ponto) VALUES (ST_MakePoint(-54.7085, -2.4385)::geography) RETURNING id`
    const [caso] = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO caso (tipo, autor_id, animal_id, local_id, ocorrido_em)
      VALUES ('perdido', ${pessoa!.id}::uuid, ${animal!.id}::uuid, ${local!.id}::uuid, now())
      RETURNING id`
    return caso!.id
  }

  it('tem a extensão uuid-ossp', async () => {
    const linhas = await prisma.$queryRaw<unknown[]>`
      SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'`
    expect(linhas).toHaveLength(1)
  })

  it.each(TABELAS)('gera o id de %s com uuid_generate_v4()', async (tabela) => {
    const [coluna] = await prisma.$queryRaw<{ column_default: string }[]>`
      SELECT column_default FROM information_schema.columns
       WHERE table_name = ${tabela} AND column_name = 'id'`
    expect(coluna?.column_default).toContain('uuid_generate_v4()')
  })

  it('recusa pessoa com e-mail e sem senha (conta_completa)', async () => {
    await expect(prisma.$executeRaw`
      INSERT INTO pessoa (nome, email) VALUES ('Sem senha', 'a@b.c')`).rejects.toThrow(/conta_completa/)
  })

  it('recusa raio de imprecisão zero ou negativo', async () => {
    await expect(prisma.$executeRaw`
      INSERT INTO local (ponto, raio_imprecisao_m)
      VALUES (ST_MakePoint(-54.7, -2.4)::geography, 0)`).rejects.toThrow(/raio_imprecisao_m/)
  })

  it('cria o caso em "procurando" quando o estado não é informado', async () => {
    const id = await criarCaso()
    const [caso] = await prisma.$queryRaw<{ estado: string }[]>`
      SELECT estado FROM caso WHERE id = ${id}::uuid`
    expect(caso?.estado).toBe('procurando')
  })

  it('recusa pergunta de verificação fora da ordem 1 a 3', async () => {
    const casoId = await criarCaso()
    await expect(prisma.$executeRaw`
      INSERT INTO pergunta_verificacao (caso_id, ordem, enunciado, resposta_esperada)
      VALUES (${casoId}::uuid, 4, 'Quarta?', 'Não existe')`).rejects.toThrow(/ordem/)
  })

  it('recusa pareamento de um caso com ele mesmo (lados_diferentes)', async () => {
    const casoId = await criarCaso()
    await expect(prisma.$executeRaw`
      INSERT INTO pareamento (caso_perdido_id, caso_encontrado_id, distancia_m, dias_diferenca)
      VALUES (${casoId}::uuid, ${casoId}::uuid, 0, 0)`).rejects.toThrow(/lados_diferentes/)
  })

  it('tem o índice parcial dos casos vigiados por última interação', async () => {
    const [indice] = await prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_caso_ultima_inter'`
    expect(indice?.indexdef).toMatch(/\(ultima_interacao_em\)/)
    expect(indice?.indexdef).toMatch(/WHERE .*procurando.*abrigado_temporariamente.*em_contato/)
  })

  async function criarTentativa(casoId: string, codigo: string): Promise<string> {
    const [pessoa] = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO pessoa (nome, telefone) VALUES ('Quem reivindica', '93991112222') RETURNING id`
    const [tentativa] = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO tentativa_verificacao (caso_id, pessoa_id, codigo_acompanhamento)
      VALUES (${casoId}::uuid, ${pessoa!.id}::uuid, ${codigo}) RETURNING id`
    return tentativa!.id
  }

  it('cria o caso sem cobrança pendente e sem id do aparelho', async () => {
    const id = await criarCaso()
    const [caso] = await prisma.$queryRaw<{ cobrado_em: Date | null; id_cliente: string | null }[]>`
      SELECT cobrado_em, id_cliente FROM caso WHERE id = ${id}::uuid`
    expect(caso).toEqual({ cobrado_em: null, id_cliente: null })
  })

  it('recusa dois casos com o mesmo id gerado no aparelho (fila sem conexão)', async () => {
    const idCliente = '0b7f8d4e-1d2c-4f7a-9c3b-5a6e7d8f9a0b'
    const primeiro = await criarCaso()
    const segundo = await criarCaso()
    await prisma.$executeRaw`UPDATE caso SET id_cliente = ${idCliente}::uuid WHERE id = ${primeiro}::uuid`
    await expect(
      prisma.$executeRaw`UPDATE caso SET id_cliente = ${idCliente}::uuid WHERE id = ${segundo}::uuid`,
    ).rejects.toThrow(/id_cliente/)
  })

  it('recusa duas reivindicações com o mesmo código de acompanhamento', async () => {
    const casoId = await criarCaso()
    await criarTentativa(casoId, 'hash-repetido')
    await expect(criarTentativa(casoId, 'hash-repetido')).rejects.toThrow(/codigo_acompanhamento/)
  })

  it('apaga a denúncia junto com o caso e solta a reivindicação apagada', async () => {
    const casoId = await criarCaso()
    const tentativaId = await criarTentativa(casoId, 'hash-da-denuncia')
    await prisma.$executeRaw`
      INSERT INTO denuncia (caso_id, tentativa_id, motivo, texto)
      VALUES (${casoId}::uuid, ${tentativaId}::uuid, 'pediu_dinheiro', 'Pediu pix para devolver')`
    await prisma.$executeRaw`DELETE FROM tentativa_verificacao WHERE id = ${tentativaId}::uuid`
    const [denuncia] = await prisma.$queryRaw<{ tentativa_id: string | null }[]>`SELECT tentativa_id FROM denuncia`
    expect(denuncia?.tentativa_id).toBeNull()
    await prisma.$executeRaw`DELETE FROM caso WHERE id = ${casoId}::uuid`
    const restantes = await prisma.$queryRaw<unknown[]>`SELECT 1 FROM denuncia`
    expect(restantes).toHaveLength(0)
  })
})
