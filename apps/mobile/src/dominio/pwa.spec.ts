import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('versão web instalável (PWA)', () => {
  const caminhoAppJson = resolve(__dirname, '../../app.json')
  const appJson = JSON.parse(readFileSync(caminhoAppJson, 'utf-8'))
  const web = appJson.expo?.web

  it('declara nome, nome curto, cores e display standalone no app.json', () => {
    expect(web).toBeDefined()
    expect(web.name).toBe('Achei um Bicho')
    expect(web.shortName).toBeTruthy()
    expect(web.themeColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(web.backgroundColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(web.display).toBe('standalone')
  })

  it('configura meta tags para iPhone e apple-touch-icon no +html.tsx', () => {
    const caminhoHtml = resolve(__dirname, '../app/+html.tsx')
    const conteudoHtml = readFileSync(caminhoHtml, 'utf-8')
    expect(conteudoHtml).toContain('apple-mobile-web-app-capable')
    expect(conteudoHtml).toContain('apple-touch-icon')
  })
})
