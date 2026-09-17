import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function iniciar(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  const porta = Number(process.env.PORT ?? 3333)
  await app.listen(porta)
}

void iniciar()
