import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'
import { URL_BANCO_TESTE } from './test/banco-teste'

// testes de integração: rodam contra o Postgres real do contêiner, num banco
// separado que é recriado do zero a cada execução
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    alias: {
      '@achei/contratos': resolve(__dirname, '../../packages/contratos/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/*.int.spec.ts'],
    environment: 'node',
    globalSetup: ['./test/preparar-banco.ts'],
    fileParallelism: false,
    env: { DATABASE_URL: URL_BANCO_TESTE, PASTA_FOTOS: join(tmpdir(), 'achei-um-bicho-fotos-teste') },
    hookTimeout: 60_000,
  },
})
