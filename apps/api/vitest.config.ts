import { resolve } from 'node:path'
import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

// testes de unidade: rápidos, sem banco. O swc é necessário porque o Nest depende
// dos metadados de decorator, que o esbuild padrão do Vitest não emite.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    alias: {
      '@achei/contratos': resolve(__dirname, '../../packages/contratos/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/*.spec.ts', 'scripts/**/*.spec.ts'],
    exclude: ['src/**/*.int.spec.ts'],
    environment: 'node',
  },
})
