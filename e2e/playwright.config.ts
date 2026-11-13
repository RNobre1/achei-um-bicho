import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'
import { URL_BANCO_E2E } from './global-setup'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORTA_API = Number(process.env.PORTA_API ?? 3333)
const PORTA_WEB = Number(process.env.PORTA_WEB ?? 8081)

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: path.resolve(__dirname, './global-setup.ts'),
  globalTeardown: path.resolve(__dirname, './global-teardown.ts'),
  use: {
    baseURL: `http://localhost:${PORTA_WEB}`,
    viewport: { width: 412, height: 892 },
    geolocation: { latitude: -2.4191, longitude: -54.7408 },
    permissions: ['geolocation'],
    locale: 'pt-BR',
    timezoneId: 'America/Santarem',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
  webServer: [
    {
      command: 'node dist/main.js',
      cwd: path.resolve(__dirname, '../apps/api'),
      port: PORTA_API,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        ...process.env,
        PORT: String(PORTA_API),
        DATABASE_URL: URL_BANCO_E2E,
        CORS_ORIGINS: `http://localhost:${PORTA_WEB}`,
        NODE_ENV: 'test',
      },
    },
    {
      command: 'node e2e/servidor-estatico.mjs',
      cwd: path.resolve(__dirname, '..'),
      port: PORTA_WEB,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        ...process.env,
        PORTA_WEB: String(PORTA_WEB),
      },
    },
  ],
})
