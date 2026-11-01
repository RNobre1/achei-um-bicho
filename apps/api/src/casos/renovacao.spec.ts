import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

function arquivosTypeScript(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
    const caminho = resolve(pasta, item.name)
    if (item.isDirectory()) return arquivosTypeScript(caminho)
    return item.isFile() && item.name.endsWith('.ts') ? [caminho] : []
  })
}

function nomeDoCampo(propriedade: ts.PropertyName): string {
  if (ts.isIdentifier(propriedade) || ts.isStringLiteral(propriedade)) return propriedade.text
  return ''
}

function estaEmLeitura(propriedade: ts.PropertyAssignment): boolean {
  for (let atual: ts.Node | undefined = propriedade.parent; atual; atual = atual.parent) {
    if (!ts.isPropertyAssignment(atual)) continue
    const nome = nomeDoCampo(atual.name)
    if (nome === 'select' || nome === 'where') return true
    if (nome === 'data') return false
  }
  return false
}

describe('fonte única da renovação de casos', () => {
  it('não escreve ultimaInteracaoEm fora do módulo de renovação e da tarefa diária', () => {
    const origem = resolve(process.cwd(), 'src')
    const arquivosPermitidos = new Set(['casos/renovacao.ts', 'tarefas/tarefas.service.ts'])
    const violacoes: string[] = []

    for (const caminho of arquivosTypeScript(origem)) {
      const relativo = relative(origem, caminho).split(sep).join('/')
      if (relativo.endsWith('.spec.ts') || arquivosPermitidos.has(relativo)) continue

      const texto = readFileSync(caminho, 'utf8')
      const fonte = ts.createSourceFile(caminho, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
      const visitar = (no: ts.Node): void => {
        if (
          ts.isPropertyAssignment(no) &&
          nomeDoCampo(no.name) === 'ultimaInteracaoEm' &&
          !estaEmLeitura(no)
        ) {
          const { line } = fonte.getLineAndCharacterOfPosition(no.getStart(fonte))
          violacoes.push(`${relativo}:${line + 1}`)
        }
        ts.forEachChild(no, visitar)
      }

      visitar(fonte)
    }

    expect(violacoes).toEqual([])
  })
})
