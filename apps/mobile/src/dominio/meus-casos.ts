import type { TipoCaso } from '@achei/contratos'

/**
 * Caso publicado neste aparelho. É assim que quem publica sem conta continua dono
 * do caso: o código de edição fica guardado aqui, e não só no papel.
 */
export interface MeuCaso {
  id: string
  tipo: TipoCaso
  codigoEdicao: string
  nome: string
  publicadoEm: string
}

export function acrescentarCaso(lista: MeuCaso[], novo: MeuCaso): MeuCaso[] {
  return [novo, ...lista.filter((caso) => caso.id !== novo.id)]
}

function ehMeuCaso(valor: unknown): valor is MeuCaso {
  if (!valor || typeof valor !== 'object') return false
  const c = valor as Record<string, unknown>
  return ['id', 'tipo', 'codigoEdicao', 'nome', 'publicadoEm'].every((chave) => typeof c[chave] === 'string')
}

/** Lista guardada no aparelho. Guardado corrompido não pode derrubar a tela. */
export function lerMeusCasos(guardado: string | null): MeuCaso[] {
  if (!guardado) return []
  try {
    const lido: unknown = JSON.parse(guardado)
    return Array.isArray(lido) ? lido.filter(ehMeuCaso) : []
  } catch {
    return []
  }
}
