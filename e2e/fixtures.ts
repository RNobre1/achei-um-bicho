import { test as baseTest, expect } from '@playwright/test'
import { limparBancoE2E } from './limpar-banco'

interface FixturesCustomizadas {
  limparBancoAutomatico: void
}

export const test = baseTest.extend<FixturesCustomizadas>({
  limparBancoAutomatico: [
    async ({}, use) => {
      await limparBancoE2E()
      await use()
    },
    { auto: true },
  ],
})

export { expect }
