import { readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
// No celular, o Expo 57 troca o fetch global pelo expo/fetch, que monta o corpo
// multipart com estas duas peças. O teste usa as duas de verdade.
import { installFormDataPatch } from 'expo/src/winter/FormData'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { criarClienteApi } from './api'
import { arquivoDaFoto } from './fotos'

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }))
vi.mock('expo-image-picker', () => ({}))
vi.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: { JPEG: 'jpeg' } }))
// o File do expo-file-system lê do disco do aparelho; aqui, do disco do teste
vi.mock('expo-file-system', () => ({
  File: class {
    constructor(readonly uri: string) {}
    get name() {
      return basename(fileURLToPath(this.uri))
    }
    get type() {
      return this.uri.endsWith('.jpg') ? 'image/jpeg' : ''
    }
    async bytes() {
      return new Uint8Array(await readFile(fileURLToPath(this.uri)))
    }
  },
}))

// importado pelo caminho em variável: o arquivo do Expo não passa no tsc deste
// projeto (supõe tipos de FormData que não usamos), mas roda igual no teste
const CONVERSOR = 'expo/src/winter/fetch/convertFormData'
const { convertFormDataAsync } = (await import(/* @vite-ignore */ CONVERSOR)) as {
  convertFormDataAsync(formulario: unknown, limite: string): Promise<{ body: Uint8Array }>
}

/** O FormData do React Native guarda as partes em _parts; o Expo completa o resto. */
class FormDataDoReactNative {
  _parts: unknown[] = []
}
installFormDataPatch(FormDataDoReactNative as unknown as typeof FormData)

// início e fim de um JPEG, o bastante para reconhecer os bytes no corpo
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9])

afterEach(() => vi.unstubAllGlobals())

describe('foto enviada pelo celular', () => {
  it('vira um corpo multipart que o expo/fetch consegue montar, com os bytes do JPEG', async () => {
    vi.stubGlobal('FormData', FormDataDoReactNative)
    const caminho = join(tmpdir(), `foto-${Date.now()}.jpg`)
    await writeFile(caminho, JPEG)
    let corpo: unknown
    const api = criarClienteApi('https://api.exemplo', async (_url, opcoes) => {
      corpo = opcoes?.body
      return new Response(JSON.stringify({ id: 'f1', caminho: '/fotos/f1.jpg' }), { status: 201 })
    })

    await api.enviarFoto('caso-1', 'CODIGO', await arquivoDaFoto(`file://${caminho}`))
    const { body } = await convertFormDataAsync(corpo, 'limite')

    const texto = Buffer.from(body).toString('latin1')
    expect(texto).toContain('content-disposition: form-data; name="foto"')
    expect(texto).toContain('content-type: image/jpeg')
    expect(Buffer.from(body).includes(Buffer.from(JPEG))).toBe(true)
  })
})
