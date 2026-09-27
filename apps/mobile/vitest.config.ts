import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// só o que é TypeScript puro (domínio e serviços); as telas são conferidas
// rodando o aplicativo exportado para web
export default defineConfig({
  resolve: {
    alias: {
      '@achei/contratos': resolve(__dirname, '../../packages/contratos/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
})
