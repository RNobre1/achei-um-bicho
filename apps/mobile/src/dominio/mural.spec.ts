import { describe, expect, it } from 'vitest'
import { descreverAnimal, nomeDoAnimal, proximoRaio, textoDoConvite } from './mural'

describe('botão "Aumentar" do mural', () => {
  it('sobe um degrau de cada vez: 1,6 km, 3 km, 5 km', () => {
    expect(proximoRaio(1600)).toBe(3000)
    expect(proximoRaio(3000)).toBe(5000)
  })

  it('no último degrau volta ao raio padrão', () => {
    expect(proximoRaio(5000)).toBe(1600)
  })
})

describe('texto do card', () => {
  const animal = { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'com', nome: null } as const

  it('usa o nome quando existe', () => {
    expect(nomeDoAnimal({ ...animal, nome: 'Nego' })).toBe('Nego')
  })

  it('diz a espécie quando o bicho não tem nome conhecido', () => {
    expect(nomeDoAnimal(animal)).toBe('Cachorro sem nome')
    expect(nomeDoAnimal({ ...animal, especie: 'gato' })).toBe('Gato sem nome')
  })

  it('descreve porte, cor e coleira com os rótulos do vocabulário', () => {
    expect(descreverAnimal(animal)).toBe('Porte médio, caramelo, com coleira.')
    expect(descreverAnimal({ ...animal, porte: 'pequeno', corDominante: 'malhado', coleira: 'nao_observado' })).toBe(
      'Porte pequeno, malhado, coleira não observada.',
    )
  })
})

describe('convite aos vizinhos no mural vazio', () => {
  it('diz o raio que está vazio e o que fazer se perder ou achar um bicho', () => {
    const texto = textoDoConvite(1600)
    expect(texto).toContain('Achei um Bicho')
    expect(texto).toContain('1,6 km')
    expect(texto).toMatch(/perder ou achar/)
  })

  it('não inventa link de loja que ainda não existe', () => {
    expect(textoDoConvite(500)).not.toMatch(/https?:\/\//)
  })
})

