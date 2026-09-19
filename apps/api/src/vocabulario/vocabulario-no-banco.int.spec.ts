import { PrismaClient } from '@prisma/client'
import { afterAll, describe, expect, it } from 'vitest'

describe('o banco recusa valor fora do vocabulário', () => {
  const prisma = new PrismaClient()

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('não aceita espécie que o manifesto não conhece', async () => {
    await expect(
      prisma.animal.create({
        data: { especie: 'papagaio', porte: 'pequeno', corDominante: 'caramelo', coleira: 'sem' },
      }),
    ).rejects.toThrow(/ck_animal_especie/)
  })

  it('aceita um animal descrito só com valores do manifesto', async () => {
    const animal = await prisma.animal.create({
      data: { especie: 'gato', porte: 'pequeno', corDominante: 'cinza', coleira: 'nao_observado' },
    })
    expect(animal.id).toBeTruthy()
    await prisma.animal.delete({ where: { id: animal.id } })
  })
})
