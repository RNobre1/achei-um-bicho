import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('versão web instalável (PWA)', () => {
  const caminhoPublic = resolve(__dirname, '../../public')
  const caminhoAppJson = resolve(__dirname, '../../app.json')
  const appJson = JSON.parse(readFileSync(caminhoAppJson, 'utf-8'))
  const web = appJson.expo?.web

  it('declara configuração web com display standalone no app.json', () => {
    expect(web).toBeDefined()
    expect(web.name).toBe('Achei um Bicho')
    expect(web.shortName).toBeTruthy()
    expect(web.themeColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(web.backgroundColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(web.display).toBe('standalone')
  })

  it('possui manifest.json válido em public/ com nome, cores, display standalone e ícones', () => {
    const caminhoManifest = resolve(caminhoPublic, 'manifest.json')
    expect(existsSync(caminhoManifest)).toBe(true)

    const manifest = JSON.parse(readFileSync(caminhoManifest, 'utf-8'))
    expect(manifest.name).toBe('Achei um Bicho')
    expect(manifest.short_name).toBe('Achei Bicho')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBe(web.themeColor)
    expect(manifest.background_color).toBe(web.backgroundColor)

    const icones = manifest.icons as Array<{ src: string; sizes: string }>
    expect(icones).toBeDefined()
    expect(icones.some((i) => i.sizes === '192x192')).toBe(true)
    expect(icones.some((i) => i.sizes === '512x512')).toBe(true)
  })

  it('mantém os metadados da exportação no index.html sem duplicar a cor do tema', () => {
    const caminhoIndexHtml = resolve(caminhoPublic, 'index.html')
    const indexHtml = readFileSync(caminhoIndexHtml, 'utf-8')
    const coresLiterais = indexHtml.match(/#[0-9a-f]{6}/gi) ?? []

    expect(indexHtml).toContain('<link rel="manifest"')
    expect(indexHtml).toContain('apple-mobile-web-app-capable')
    expect(indexHtml).toContain('apple-touch-icon')
    expect(indexHtml).not.toMatch(/<meta\s+name=["']theme-color["']/i)
    for (const cor of coresLiterais) {
      expect([web.themeColor.toUpperCase(), web.backgroundColor.toUpperCase()]).toContain(cor.toUpperCase())
    }
    expect(existsSync(resolve(__dirname, '../app/+html.tsx'))).toBe(false)
  })

  it('possui os arquivos de ícone gerados em public/', () => {
    const icon192 = resolve(caminhoPublic, 'icon-192.png')
    const icon512 = resolve(caminhoPublic, 'icon-512.png')
    const appleTouchIcon = resolve(caminhoPublic, 'apple-touch-icon.png')

    expect(existsSync(icon192)).toBe(true)
    expect(statSync(icon192).size).toBeGreaterThan(0)

    expect(existsSync(icon512)).toBe(true)
    expect(statSync(icon512).size).toBeGreaterThan(0)

    expect(existsSync(appleTouchIcon)).toBe(true)
    expect(statSync(appleTouchIcon).size).toBeGreaterThan(0)
  })

  it('não possui service worker registrado', () => {
    const serviceWorkerPath = resolve(caminhoPublic, 'sw.js')
    expect(existsSync(serviceWorkerPath)).toBe(false)
  })
})
