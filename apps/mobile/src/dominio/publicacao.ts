import {
  MENSAGEM_SEM_CONTATO,
  pareceContato,
  type Coleira,
  type Cor,
  type Especie,
  type NovaPublicacao,
  type Porte,
  TELEFONE,
  type TipoCaso,
} from '@achei/contratos'

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
    castrado?: boolean
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

export type OpcaoChipCastrado = 'sim' | 'nao' | 'nao_sei'

export function converterChipParaCastrado(chip: OpcaoChipCastrado | undefined): boolean | undefined {
  if (chip === 'sim') return true
  if (chip === 'nao') return false
  return undefined
}

export function converterCastradoParaChip(castrado: boolean | undefined): OpcaoChipCastrado | undefined {
  if (castrado === true) return 'sim'
  if (castrado === false) return 'nao'
  return undefined
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
      if (pareceContato(r.animal.nome ?? '') || pareceContato(r.relato)) falta.push(MENSAGEM_SEM_CONTATO)
      break
    case 'ondeQuando':
      if (r.local.latitude === undefined || r.local.longitude === undefined) falta.push('Marque onde aconteceu')
      if (!r.quando) falta.push('Diga quando aconteceu')
      if (pareceContato(r.local.bairro)) falta.push(MENSAGEM_SEM_CONTATO)
      break
    case 'verificacao':
      r.perguntas.forEach((p, i) => {
        if (i >= 3) return
        if (!p.enunciado.trim()) falta.push(`Escreva a pergunta ${i + 1}`)
        else if (!p.resposta.trim()) falta.push(`Responda a pergunta ${i + 1}`)
      })
      if (r.perguntas.some((p) => pareceContato(p.enunciado))) falta.push(MENSAGEM_SEM_CONTATO)
      if (!r.autor.nome.trim()) falta.push('Diga seu nome')
      if (r.autor.telefone.trim()) {
        const digitos = TELEFONE.normalizar(r.autor.telefone)
        if (!TELEFONE.expressao.test(digitos)) {
          falta.push(TELEFONE.mensagem)
        }
      }
      break
  }
  return falta
}

/**
 * Ponto no tempo a partir do dia e período aproximados do rascunho. Usa as horas
 * centrais de cada período em Santarém (9h manhã, 16h tarde, 20h noite) e nunca
 * projeta para o futuro: hoje à noite, preenchido à tarde, vira a hora atual.
 */
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

/**
 * Converte o rascunho para o corpo esperado pelo POST /casos da API. Limpa
 * pontuação de telefone e espaços soltos. Devolve o objeto pronto para o JSON.
 */
export function montarPublicacao(r: RascunhoPublicacao, agora: Date = new Date()): NovaPublicacao {
  for (const passo of PASSOS) {
    const pendencias = pendenciasDoPasso(r, passo.id)
    if (pendencias.length > 0) {
      throw new Error(`Não dá para publicar com pendências: ${pendencias.join(', ')}`)
    }
  }

  const telefone = r.autor.telefone.replace(/\D/g, '')
  const nome = preenchido(r.animal.nome)
  const bairro = preenchido(r.local.bairro)
  const referencia = preenchido(r.local.referencia)
  const relato = preenchido(r.relato)

  const corpo: NovaPublicacao = {
    tipo: r.tipo,
    animal: {
      especie: r.animal.especie!,
      porte: r.animal.porte!,
      corDominante: r.animal.corDominante!,
      coleira: r.animal.coleira!,
      ...(nome && { nome }),
      ...(typeof r.animal.castrado === 'boolean' && { castrado: r.animal.castrado }),
    },
    local: {
      latitude: r.local.latitude!,
      longitude: r.local.longitude!,
      ...(bairro && { bairro }),
      ...(referencia && { referencia }),
    },
    autor: {
      nome: r.autor.nome.trim(),
      ...(telefone && { telefone }),
    },
    ocorridoEm: momentoDoPeriodo(r.quando!, agora),
    perguntas: r.perguntas.map((p) => ({ enunciado: p.enunciado.trim(), respostaEsperada: p.resposta.trim() })),
    ...(relato && { relato }),
  }
  return corpo
}
