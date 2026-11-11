import { type INestApplication, ValidationPipe } from '@nestjs/common'
import { lerConfiguracao } from './configuracao'

/**
 * Tudo o que a aplicação precisa além dos módulos. Fica separado do main.ts para
 * os testes de integração subirem a aplicação exatamente como ela roda.
 */
export function configurarApp(app: INestApplication): void {
  const config = lerConfiguracao()
  const httpAdapter = app.getHttpAdapter()
  if (httpAdapter && typeof (httpAdapter.getInstance() as any)?.set === 'function') {
    ;(httpAdapter.getInstance() as any).set('trust proxy', config.saltosDeProxy)
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
}
