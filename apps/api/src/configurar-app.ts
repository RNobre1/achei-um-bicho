import { type INestApplication, ValidationPipe } from '@nestjs/common'

/**
 * Tudo o que a aplicação precisa além dos módulos. Fica separado do main.ts para
 * os testes de integração subirem a aplicação exatamente como ela roda.
 */
export function configurarApp(app: INestApplication): void {
  const httpAdapter = app.getHttpAdapter()
  if (httpAdapter && typeof (httpAdapter.getInstance() as any)?.set === 'function') {
    ;(httpAdapter.getInstance() as any).set('trust proxy', true)
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
}
