/**
 * Regrava os diagramas gerados em docs/uml: classes (do schema) e estados (das
 * transições em contratos). Os testes de frescor reprovam enquanto o arquivo em
 * disco estiver diferente do gerado.
 *
 *     pnpm --filter @achei/api gerar:diagrama
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ARQUIVO_DIAGRAMA, gerarDiagramaClasses } from '../src/uml/diagrama-classes'
import { ARQUIVO_ESTADOS, gerarDiagramaEstados } from '../src/uml/diagrama-estados'

const raiz = resolve(__dirname, '../../..')
for (const [arquivo, gerar] of [
  [ARQUIVO_DIAGRAMA, gerarDiagramaClasses],
  [ARQUIVO_ESTADOS, gerarDiagramaEstados],
] as const) {
  writeFileSync(resolve(raiz, arquivo), gerar(), 'utf-8')
  console.log(arquivo)
}
