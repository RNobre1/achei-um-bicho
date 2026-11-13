import { type ExecutionContext, Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { lerConfiguracao } from '../configuracao'

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

  private cabecalhoIpCliente: string | null | undefined

  protected override async getTracker(req: Record<string, any>): Promise<string> {
    // atrás do Cloudflare (Render), o IP da conexão muda a cada requisição; o Cloudflare
    // escreve o IP do cliente num cabeçalho próprio e sobrescreve o que o cliente mandar
    if (this.cabecalhoIpCliente === undefined) this.cabecalhoIpCliente = lerConfiguracao().cabecalhoIpCliente ?? null
    const doProxy = this.cabecalhoIpCliente ? req.headers?.[this.cabecalhoIpCliente] : undefined
    if (typeof doProxy === 'string' && doProxy.trim()) return doProxy.trim()
    // sem o cabeçalho, vale o IP pela regra do trust proxy (SALTOS_DE_PROXY)
    return req.ip || req.socket?.remoteAddress || '127.0.0.1'
  }

  protected override generateKey(_context: ExecutionContext, tracker: string, name: string): string {
    // Balde global por IP para o tipo de operação (leitura, escrita ou fotos)
    return `${tracker}-${name}`
  }
}
