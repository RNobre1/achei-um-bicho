import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = resolve(process.cwd(), '../..')
const DIRETORIOS = ['packages/contratos/src', 'apps/mobile/src', 'apps/api/src']

function arquivosTypeScript(diretorio: string): string[] {
  return readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(diretorio, entrada.name)
    if (entrada.isDirectory()) return arquivosTypeScript(caminho)
    return /\.tsx?$/.test(entrada.name) ? [caminho] : []
  })
}

describe('compatibilidade com Safari anterior ao iOS 16.4', () => {
  it('não usa lookbehind em código TypeScript do app, da API ou dos contratos', () => {
    const lookbehinds = ['(?<' + '=', '(?<' + '!']
    const encontrados = DIRETORIOS.flatMap((diretorio) => arquivosTypeScript(join(RAIZ, diretorio))).filter(
      (arquivo) => lookbehinds.some((trecho) => readFileSync(arquivo, 'utf-8').includes(trecho)),
    )

    expect(encontrados).toEqual([])
  })
})
