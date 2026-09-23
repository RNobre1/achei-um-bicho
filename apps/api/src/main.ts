import 'reflect-metadata'
import { existsSync } from 'node:fs'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { lerConfiguracao } from './configuracao'
import { configurarApp } from './configurar-app'

async function iniciar(): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env')
  const config = lerConfiguracao()
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: config.origensCors })
  configurarApp(app)
  await app.listen(config.porta)
}

void iniciar()
