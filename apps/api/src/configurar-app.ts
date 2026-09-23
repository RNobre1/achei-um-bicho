import { type INestApplication, ValidationPipe } from '@nestjs/common'

/**
 * Tudo o que a aplicação precisa além dos módulos. Fica separado do main.ts para
 * os testes de integração subirem a aplicação exatamente como ela roda.
 */
export function configurarApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
}
