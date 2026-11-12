import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = resolve(process.cwd(), '../..')
const DIRETORIOS = ['apps/api/src', 'apps/mobile/src']

function arquivosTypeScript(diretorio: string): string[] {
  return readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(diretorio, entrada.name)
    if (entrada.isDirectory()) return arquivosTypeScript(caminho)
    return /\.tsx?$/.test(entrada.name) ? [caminho] : []
  })
}

describe('limites textuais derivados dos contratos', () => {
  it('não repete limites numéricos em validadores da API nem em campos do app', () => {
    const decorador = '@MaxLength' + '\('
    const propriedade = 'maxLength=' + '\{'
    const escapar = (valor: string) => valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const padroes = [new RegExp(`${escapar(decorador)}\\s*\\d+`), new RegExp(`${escapar(propriedade)}\\s*\\d+`)]
    const encontrados = DIRETORIOS.flatMap((diretorio) => arquivosTypeScript(join(RAIZ, diretorio))).filter((arquivo) =>
      padroes.some((padrao) => padrao.test(readFileSync(arquivo, 'utf-8'))),
    )

    expect(encontrados).toEqual([])
  })

  it('todo campo de texto das telas tem limite, para a API não recusar depois do que a tela aceitou', () => {
    const telas = arquivosTypeScript(join(RAIZ, 'apps/mobile/src/telas'))
    const semLimite = telas.flatMap((arquivo) => {
      const texto = readFileSync(arquivo, 'utf-8')
      const campos = texto.match(/<Campo\b[\s\S]*?\/>/g) ?? []
      return campos
        .filter((campo) => !campo.includes('maxLength'))
        .map((campo) => `${arquivo.replace(RAIZ + '/', '')}: ${campo.match(/rotulo="([^"]*)"/)?.[1] ?? '?'}`)
    })

    expect(semLimite).toEqual([])
  })
})
