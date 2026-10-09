import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ESTADO_CASO, ESTADO_INICIAL, TRANSICOES_DO_CASO } from '@achei/contratos'
import { describe, expect, it } from 'vitest'
import { ARQUIVO_ESTADOS, gerarDiagramaEstados, POSICOES_ESTADOS } from './diagrama-estados'

const xml = gerarDiagramaEstados()

describe('diagrama de estados gerado do ciclo de vida declarado em contratos', () => {
  it('tem uma caixa para cada estado do vocabulário, com o rótulo da tela', () => {
    for (const estado of ESTADO_CASO.valores) {
      expect(xml).toContain(`id="estado-${estado}"`)
      expect(xml).toContain(ESTADO_CASO.entradas[estado].rotulo)
    }
  })

  it('toda transição declarada vira uma seta com o evento que a provoca', () => {
    for (const t of TRANSICOES_DO_CASO) {
      expect(xml).toContain(`source="estado-${t.de}" target="estado-${t.para}"`)
      expect(xml).toContain(t.quando)
    }
  })

  it('parte do estado inicial de cada lado do caso', () => {
    for (const estado of new Set(Object.values(ESTADO_INICIAL))) {
      expect(xml).toContain(`source="inicio" target="estado-${estado}"`)
    }
  })

  it('leva os estados sem saída ao estado final', () => {
    expect(xml).toContain('source="estado-resolvido" target="fim"')
    expect(xml).toContain('source="estado-expirado" target="fim"')
  })

  it('todo estado tem lugar declarado no desenho', () => {
    for (const estado of ESTADO_CASO.valores) expect(POSICOES_ESTADOS[estado], estado).toBeDefined()
  })

  it('o arquivo em docs/uml está em dia com o código', () => {
    const emDisco = readFileSync(resolve(__dirname, '../../../..', ARQUIVO_ESTADOS), 'utf-8')
    expect(emDisco, 'rode: pnpm --filter @achei/api gerar:diagrama').toBe(xml)
  })
})
