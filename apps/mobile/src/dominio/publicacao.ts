import type { Coleira, Cor, Especie, NovaPublicacao, Porte, TipoCaso } from '@achei/contratos'

export type IdPasso = 'tipo' | 'animal' | 'ondeQuando' | 'verificacao'

/** Quatro passos: o critério de aceite da publicação é não passar disso. */
export const PASSOS: readonly { id: IdPasso; titulo: string }[] = [
  { id: 'tipo', titulo: 'O que aconteceu?' },
  { id: 'animal', titulo: 'Como ele é?' },
  { id: 'ondeQuando', titulo: 'Onde e quando?' },
  { id: 'verificacao', titulo: 'Só você sabe' },
]

export type Dia = 'hoje' | 'ontem'
export type Periodo = 'manha' | 'tarde' | 'noite'

export interface Quando {
  dia: Dia
  periodo: Periodo
}

export interface PerguntaDoRascunho {
  enunciado: string
  resposta: string
}

export interface RascunhoPublicacao {
  tipo: TipoCaso
  animal: {
    especie?: Especie
    porte?: Porte
    corDominante?: Cor
    coleira?: Coleira
    nome: string
  }
  local: {
    latitude?: number
    longitude?: number
    bairro: string
    referencia: string
  }
  quando?: Quando
  relato: string
  autor: { nome: string; telefone: string }
  perguntas: PerguntaDoRascunho[]
  /** Endereços locais das fotos já reduzidas; sobem depois que o caso é criado. */
  fotos: string[]
}

// Quem perdeu responde sobre o que só o tutor sabe; quem achou, sobre o que só
// quem está com o animal na frente consegue ver.
const PERGUNTAS: Record<TipoCaso, string[]> = {
  perdido: [
    'Qual sinal ele tem que não aparece na foto?',
    'Que nome ele atende?',
    'O que ele estava usando quando sumiu?',
  ],
  encontrado: [
    'Qual sinal ele tem que não aparece na foto?',
    'Tem alguma marca, cicatriz ou mancha escondida no corpo?',
    'Como ele reage quando alguém chama?',
  ],
}

const HORA_DO_PERIODO: Record<Periodo, number> = { manha: 9, tarde: 16, noite: 20 }

export function perguntasSugeridas(tipo: TipoCaso): string[] {
  return [...PERGUNTAS[tipo]]
}

export function rascunhoVazio(tipo: TipoCaso): RascunhoPublicacao {
  return {
    tipo,
    animal: { nome: '' },
    local: { bairro: '', referencia: '' },
    relato: '',
    autor: { nome: '', telefone: '' },
    perguntas: perguntasSugeridas(tipo).map((enunciado) => ({ enunciado, resposta: '' })),
    fotos: [],
  }
}

/** O que ainda falta para o passo estar completo, no texto que a tela mostra. */
export function pendenciasDoPasso(r: RascunhoPublicacao, passo: IdPasso): string[] {
  const falta: string[] = []
  switch (passo) {
    case 'tipo':
      if (!r.tipo) falta.push('Escolha o que aconteceu')
      break
    case 'animal':
      if (!r.animal.especie) falta.push('Escolha a espécie')
      if (!r.animal.porte) falta.push('Escolha o porte')
      if (!r.animal.corDominante) falta.push('Escolha a cor')
      if (!r.animal.coleira) falta.push('Diga se tinha coleira')
      break
    case 'ondeQuando':
      if (r.local.latitude === undefined || r.local.longitude === undefined) falta.push('Marque onde aconteceu')
      if (!r.quando) falta.push('Diga quando aconteceu')
      break
    case 'verificacao':
      r.perguntas.forEach((p, i) => {
        if (!p.enunciado.trim()) falta.push(`Escreva a pergunta ${i + 1}`)
        else if (!p.resposta.trim()) falta.push(`Responda a pergunta ${i + 1}`)
      })
      if (!r.autor.nome.trim()) falta.push('Diga seu nome')
      break
  }
  return falta
}

/** Hora aproximada a partir de dia e período, sem nunca cair no futuro. */
export function momentoDoPeriodo(quando: Quando, agora: Date = new Date()): string {
  const momento = new Date(agora)
  if (quando.dia === 'ontem') momento.setDate(momento.getDate() - 1)
  momento.setHours(HORA_DO_PERIODO[quando.periodo], 0, 0, 0)
  return (momento > agora ? agora : momento).toISOString()
}

function preenchido(texto: string): string | undefined {
  const limpo = texto.trim()
  return limpo === '' ? undefined : limpo
}

/** Corpo de POST /casos. Só monta com todos os passos completos. */
export function montarPublicacao(r: RascunhoPublicacao, agora: Date = new Date()): NovaPublicacao {
  const pendencias = PASSOS.flatMap((passo) => pendenciasDoPasso(r, passo.id))
  if (pendencias.length > 0) throw new Error(pendencias.join('\n'))

  const telefone = r.autor.telefone.replace(/\D/g, '')
  const corpo: NovaPublicacao = {
    tipo: r.tipo,
    animal: {
      especie: r.animal.especie!,
      porte: r.animal.porte!,
      corDominante: r.animal.corDominante!,
      coleira: r.animal.coleira!,
      ...(preenchido(r.animal.nome) && { nome: preenchido(r.animal.nome) }),
    },
    local: {
      latitude: r.local.latitude!,
      longitude: r.local.longitude!,
      ...(preenchido(r.local.bairro) && { bairro: preenchido(r.local.bairro) }),
      ...(preenchido(r.local.referencia) && { referencia: preenchido(r.local.referencia) }),
    },
    autor: {
      nome: r.autor.nome.trim(),
      ...(telefone && { telefone }),
    },
    ocorridoEm: momentoDoPeriodo(r.quando!, agora),
    perguntas: r.perguntas.map((p) => ({ enunciado: p.enunciado.trim(), respostaEsperada: p.resposta.trim() })),
  }
  const relato = preenchido(r.relato)
  if (relato) corpo.relato = relato
  return corpo
}
