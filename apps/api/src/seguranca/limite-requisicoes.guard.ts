import { type ExecutionContext, Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

@Injectable()
export class LimiteRequisicoesGuard extends ThrottlerGuard {
  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    const url = req.originalUrl || req.url || ''
    const caminho = url.split('?')[0]
    // Exceções ao limite de requisições: /saude exato e /tarefas/ com barra
    if (caminho === '/saude' || caminho.startsWith('/tarefas/')) {
      return true
    }
    return false
  }

  protected override async getTracker(req: Record<string, any>): Promise<string> {
    // Com trust proxy configurado com saltos, req.ip reflete o IP confiável via X-Forwarded-For
    return req.ip || req.socket?.remoteAddress || '127.0.0.1'
  }

  protected override generateKey(_context: ExecutionContext, tracker: string, name: string): string {
    // Balde global por IP para o tipo de operação (leitura, escrita ou fotos)
    return `${tracker}-${name}`
  }
}
