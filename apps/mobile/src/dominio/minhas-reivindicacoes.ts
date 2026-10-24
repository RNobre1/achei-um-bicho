import type { TipoCaso } from '@achei/contratos'

export interface MinhaReivindicacao {
  id: string
  casoId: string
  tipoCaso: TipoCaso
  codigoAcompanhamento: string
  criadoEm: string
  nomeAnimal?: string
}

export function acrescentarReivindicacao(lista: MinhaReivindicacao[], nova: MinhaReivindicacao): MinhaReivindicacao[] {
  return [nova, ...lista.filter((r) => r.id !== nova.id)]
}

function ehMinhaReivindicacao(valor: unknown): valor is MinhaReivindicacao {
  if (!valor || typeof valor !== 'object') return false
  const r = valor as Record<string, unknown>
  return ['id', 'casoId', 'tipoCaso', 'codigoAcompanhamento', 'criadoEm'].every(
    (chave) => typeof r[chave] === 'string',
  )
}

export function lerMinhasReivindicacoes(guardado: string | null): MinhaReivindicacao[] {
  if (!guardado) return []
  try {
    const lido: unknown = JSON.parse(guardado)
    return Array.isArray(lido) ? lido.filter(ehMinhaReivindicacao) : []
  } catch {
    return []
  }
}
