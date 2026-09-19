import 'reflect-metadata'
import { existsSync } from 'node:fs'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { lerConfiguracao } from './configuracao'

async function iniciar(): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env')
  const config = lerConfiguracao()
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: config.origensCors })
  await app.listen(config.porta)
}

void iniciar()
