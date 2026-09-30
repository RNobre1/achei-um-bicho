import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { VOCABULARIO } from '@achei/contratos'
import { Prisma } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { ARQUIVO_DIAGRAMA, gerarDiagramaClasses, modeloDeClasses, POSICOES } from './diagrama-classes'

const modelo = modeloDeClasses()
const classe = (nome: string) => modelo.classes.find((c) => c.nome === nome)!

describe('diagrama de classes gerado do schema e do vocabulário', () => {
  it('tem uma classe para cada modelo do banco', () => {
    expect(modelo.classes.map((c) => c.nome).sort()).toEqual(Prisma.dmmf.datamodel.models.map((m) => m.name).sort())
  })

  it('não lista chave estrangeira como atributo: ela vira associação', () => {
    const atributos = classe('Caso').atributos.join('\n')
    expect(atributos).not.toMatch(/autorId|animalId|localId/)
    expect(atributos).not.toMatch(/avistamentos|perguntas/)
  })

  it('tipa com a enumeração as colunas de vocabulário fechado', () => {
    expect(classe('Caso').atributos).toContain('estado: EstadoCaso')
    expect(classe('Animal').atributos).toContain('corDominante: Cor')
    expect(classe('Pareamento').atributos).toContain('veredito: VereditoPareamento')
  })

  it('marca o opcional e mostra o ponto geográfico que o Prisma não enxerga', () => {
    expect(classe('Caso').atributos).toContain('codigoEdicao: String [0..1]')
    expect(classe('Local').atributos).toContain('ponto: geography(Point, 4326)')
  })

  it('tem uma enumeração para cada conjunto do vocabulário, com os mesmos valores', () => {
    expect(modelo.enumeracoes).toHaveLength(Object.keys(VOCABULARIO).length)
    for (const conjunto of Object.values(VOCABULARIO)) {
      const achada = modelo.enumeracoes.find((e) => e.valores.join() === conjunto.valores.join())
      expect(achada, conjunto.descricao).toBeDefined()
    }
  })

  it('tem uma associação para cada relação do banco, com a multiplicidade das duas pontas', () => {
    const relacoes = new Set(
      Prisma.dmmf.datamodel.models.flatMap((m) => m.fields.filter((f) => f.relationName).map((f) => f.relationName)),
    )
    expect(modelo.associacoes).toHaveLength(relacoes.size)
    expect(modelo.associacoes).toContainEqual({ origem: 'Caso', destino: 'Pessoa', multOrigem: '0..*', multDestino: '1', papel: 'autor' })
    expect(modelo.associacoes).toContainEqual({ origem: 'Caso', destino: 'Animal', multOrigem: '0..1', multDestino: '1', papel: 'animal' })
    expect(modelo.associacoes).toContainEqual({ origem: 'Avistamento', destino: 'Pessoa', multOrigem: '0..*', multDestino: '0..1', papel: 'pessoa' })
  })

  it('distingue os dois lados do pareamento pelo papel', () => {
    const papeis = modelo.associacoes.filter((a) => a.origem === 'Pareamento').map((a) => a.papel)
    expect(papeis.sort()).toEqual(['casoEncontrado', 'casoPerdido'])
  })

  it('toda classe e toda enumeração tem lugar declarado no desenho', () => {
    for (const nome of [...modelo.classes, ...modelo.enumeracoes].map((c) => c.nome)) {
      expect(POSICOES[nome], `${nome} sem posição no diagrama`).toBeDefined()
    }
  })

  it('o arquivo em docs/uml está em dia com o código', () => {
    const emDisco = readFileSync(resolve(__dirname, '../../../..', ARQUIVO_DIAGRAMA), 'utf-8')
    expect(emDisco, 'rode: pnpm --filter @achei/api gerar:diagrama').toBe(gerarDiagramaClasses())
  })
})
