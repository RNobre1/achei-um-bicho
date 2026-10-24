import type { TipoCaso } from '@achei/contratos'

/** Rótulo do botão principal de reivindicação em CasoAberto.tsx */
export function rotuloBotaoReivindicar(tipo: TipoCaso): string {
  return tipo === 'perdido' ? 'Acho que achei esse bicho' : 'Acho que esse bicho é meu'
}

/** Só pede referência para quem está com o animal (caso perdido) */
export function pedeReferencia(tipo: TipoCaso): boolean {
  return tipo === 'perdido'
}

/** Limpa caracteres não numéricos do telefone */
export function limparTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '')
}

/** Valida se o telefone possui 10 ou 11 dígitos */
export function telefoneValido(telefone: string): boolean {
  const digitos = limparTelefone(telefone)
  return digitos.length === 10 || digitos.length === 11
}

export interface DadosFormularioReivindicacao {
  tipoCaso: TipoCaso
  respostas: { perguntaId: string; texto: string }[]
  pessoa: {
    nome: string
    telefone: string
    referencia?: string
  }
}

/** Valida se todos os campos obrigatórios da reivindicação foram preenchidos */
export function formularioReivindicacaoValido(dados: DadosFormularioReivindicacao): boolean {
  if (dados.respostas.length === 0) return false
  const respostasPreenchidas = dados.respostas.every((r) => r.texto.trim().length > 0)
  if (!respostasPreenchidas) return false

  if (dados.pessoa.nome.trim().length === 0) return false
  if (!telefoneValido(dados.pessoa.telefone)) return false

  if (pedeReferencia(dados.tipoCaso)) {
    if (!dados.pessoa.referencia || dados.pessoa.referencia.trim().length === 0) {
      return false
    }
  }

  return true
}

export const AVISO_SEGURANCA_CONTATO =
  'Nunca pague adiantado para receber o animal; combine o encontro em um local público e movimentado.'

export const AVISO_APP_NAO_DECIDE =
  'O aplicativo não decide de quem é o animal: quem publicou vai conferir suas respostas para liberar o contato.'
