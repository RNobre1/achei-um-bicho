import { type ExecutionContext, Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

@Injectable()
export class LimiteRequisicoesGuard extends ThrottlerGuard {
  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    const url = req.originalUrl || req.url || ''
    // Exceções ao limite de requisições: /saude e /tarefas/*
    if (url === '/saude' || url.startsWith('/saude/') || url.startsWith('/tarefas')) {
      return true
    }
    return false
  }

  protected override async getTracker(req: Record<string, any>): Promise<string> {
    // Com trust proxy ativado, req.ip reflete o IP do cliente via X-Forwarded-For
    return req.ip || req.socket?.remoteAddress || '127.0.0.1'
  }

  protected override generateKey(_context: ExecutionContext, tracker: string, name: string): string {
    // Balde global por IP para leitura ou escrita (independente da rota/controlador)
    return `${tracker}-${name}`
  }
}
