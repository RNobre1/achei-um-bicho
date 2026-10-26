import {
  ESTADOS_ABERTOS,
  ESTADOS_VIGIADOS,
  TELEFONE,
  type EstadoCaso,
  type NovaReivindicacao,
  type TipoCaso,
  type VereditoVerificacao,
} from '@achei/contratos'

/** Rótulo do botão principal de reivindicação em CasoAberto.tsx */
export function rotuloBotaoReivindicar(tipo: TipoCaso): string {
  return tipo === 'perdido' ? 'Acho que achei esse bicho' : 'Acho que esse bicho é meu'
}

/** Rótulo curto para a aba Meus casos */
export function rotuloCurtoReivindicacao(tipo: TipoCaso): string {
  return tipo === 'perdido' ? 'Acho que achei' : 'Acho que é meu'
}

/** Rótulos de veredito para o cabeçalho da tela de situação */
export const ROTULOS_VEREDITO_SITUACAO: Record<VereditoVerificacao, string> = {
  pendente: 'Aguardando verificação',
  aceita: 'Reivindicação aceita!',
  recusada: 'Reivindicação recusada',
}

/** Rótulos de veredito para listagens e etiquetas do autor */
export const ROTULOS_VEREDITO_LISTA: Record<VereditoVerificacao, string> = {
  pendente: 'AGUARDANDO DECISÃO',
  aceita: 'ACEITA',
  recusada: 'RECUSADA',
}

/** Só pede referência para quem está com o animal (caso perdido) */
export function pedeReferencia(tipo: TipoCaso): boolean {
  return tipo === 'perdido'
}

/** Limpa caracteres não numéricos do telefone */
export function limparTelefone(telefone: string): string {
  return TELEFONE.normalizar(telefone)
}

/** Valida se o telefone possui 10 ou 11 dígitos */
export function telefoneValido(telefone: string): boolean {
  const digitos = limparTelefone(telefone)
  return TELEFONE.expressao.test(digitos)
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

export interface ParametrosMontarPedido {
  respostas: { perguntaId: string; texto: string }[]
  nome: string
  telefone: string
  tipoCaso: TipoCaso
  referencia?: string
  casoProprio?: { id: string; codigoEdicao: string } | null
}

/** Monta o payload do pedido de reivindicação conforme as regras de negócio */
export function montarPedidoReivindicacao(params: ParametrosMontarPedido): NovaReivindicacao {
  return {
    respostas: params.respostas.map((r) => ({
      perguntaId: r.perguntaId,
      texto: r.texto.trim(),
    })),
    pessoa: {
      nome: params.nome.trim(),
      telefone: TELEFONE.normalizar(params.telefone),
      ...(pedeReferencia(params.tipoCaso) && params.referencia?.trim()
        ? { referencia: params.referencia.trim() }
        : {}),
    },
    ...(params.casoProprio ? { casoProprio: params.casoProprio } : {}),
  }
}

/** Aceitar só aparece quando a reivindicação é pendente e o caso está em estado aberto */
export function podeAceitar(veredito: VereditoVerificacao, estadoCaso: EstadoCaso): boolean {
  return veredito === 'pendente' && ESTADOS_ABERTOS.includes(estadoCaso)
}

/** Recusar aparece quando a reivindicação é pendente e o caso está aberto ou em contato */
export function podeRecusar(veredito: VereditoVerificacao, estadoCaso: EstadoCaso): boolean {
  return veredito === 'pendente' && ESTADOS_VIGIADOS.includes(estadoCaso)
}

export function podeDecidirReivindicacao(veredito: VereditoVerificacao, estadoCaso: EstadoCaso): boolean {
  return podeAceitar(veredito, estadoCaso) || podeRecusar(veredito, estadoCaso)
}

/** Texto explicativo para alerta de denúncias associadas ao telefone do reivindicante */
export function textoAvisoDenunciasDoTelefone(total: number): string {
  if (total <= 0) return ''
  return total === 1
    ? 'Este telefone tem 1 reivindicação denunciada'
    : `Este telefone tem ${total} reivindicações denunciadas`
}

/** Identifica que o backend exigiu telefone de contato ao aceitar */
export function erroExigeTelefoneDoAutor(status: number): boolean {
  return status === 422
}

export const MENSAGEM_CONFIRMACAO_RECUSA =
  'Tem certeza de que deseja recusar esta reivindicação? Não é possível desfazer e este telefone não poderá reivindicar este caso novamente.'

export const AVISO_SEGURANCA_CONTATO =
  'Nunca pague adiantado para receber o animal; combine o encontro em um local público e movimentado.'

export const AVISO_APP_NAO_DECIDE =
  'O aplicativo não decide de quem é o animal: quem publicou vai conferir suas respostas para liberar o contato.'
