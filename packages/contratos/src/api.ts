/**
 * Formato das requisições e respostas da API. A API implementa estas interfaces e
 * o aplicativo as consome: é o contrato entre os dois, declarado uma vez só.
 */
import type { Coleira, Cor, Especie, EstadoCaso, Porte, TipoCaso, VereditoPareamento } from './vocabulario'

export interface AnimalNaPublicacao {
  especie: Especie
  porte: Porte
  corDominante: Cor
  coleira: Coleira
  nome?: string
  castrado?: boolean
}

export interface LocalNaPublicacao {
  latitude: number
  longitude: number
  bairro?: string
  referencia?: string
}

export interface AutorNaPublicacao {
  nome: string
  telefone?: string
}

export interface PerguntaNaPublicacao {
  enunciado: string
  respostaEsperada: string
}

/** Corpo de POST /casos. */
export interface NovaPublicacao {
  tipo: TipoCaso
  animal: AnimalNaPublicacao
  local: LocalNaPublicacao
  autor: AutorNaPublicacao
  /** Data e hora em ISO 8601. */
  ocorridoEm: string
  relato?: string
  /** Exatamente três. */
  perguntas: PerguntaNaPublicacao[]
}

/** Resposta de POST /casos. O código de edição só aparece aqui, uma vez. */
export interface CasoPublicado {
  id: string
  tipo: TipoCaso
  estado: EstadoCaso
  codigoEdicao: string
}

/** Parâmetros de GET /casos. */
export interface ConsultaMural {
  latitude: number
  longitude: number
  raio?: number
  tipo?: TipoCaso
}

export interface AnimalPublico {
  especie: Especie
  porte: Porte
  corDominante: Cor
  coleira: Coleira
  nome: string | null
}

export interface CasoNoMural {
  id: string
  tipo: TipoCaso
  estado: EstadoCaso
  relato: string | null
  publicadoEm: string
  ocorridoEm: string
  bairro: string | null
  distanciaM: number
  animal: AnimalPublico
  /** Caminho da primeira foto, relativo ao endereço da API; nulo quando não há foto. */
  foto: string | null
}

/** Resposta de GET /casos. */
export interface Mural {
  raioM: number
  casos: CasoNoMural[]
  /** Casos abertos até o raio máximo; o mural vazio usa para oferecer ampliar. */
  totalNoRaioMaximo: number
}

/**
 * Resposta de GET /casos/:id. Contato, código de edição, respostas de verificação
 * e o ponto exato ficam de fora por construção: não existe campo para eles.
 */
export interface CasoAberto {
  id: string
  tipo: TipoCaso
  estado: EstadoCaso
  relato: string | null
  ocorridoEm: string
  publicadoEm: string
  animal: AnimalPublico & { castrado: boolean | null }
  /** Caminhos das fotos, relativos ao endereço da API, na ordem de envio. */
  fotos: string[]
  area: {
    latitude: number
    longitude: number
    raioM: number
    bairro: string | null
  }
}

/** Cabeçalho em que quem publicou prova a autoria com o código de edição. */
export const CABECALHO_CODIGO_EDICAO = 'x-codigo-edicao'

/** Corpo de POST /casos/:id/avistamentos. Registrar avistamento não exige conta. */
export interface NovoAvistamento {
  latitude: number
  longitude: number
  bairro?: string
  /** Data e hora em ISO 8601. */
  vistoEm: string
  observacao?: string
}

/** Resposta de POST /casos/:id/avistamentos. */
export interface AvistamentoRegistrado {
  id: string
  vistoEm: string
}

/**
 * Item de GET /casos/:id/avistamentos, que só quem publicou vê. O ponto de quem
 * avisou não sai: pode ser a casa dessa pessoa. Sai a distância e o bairro.
 */
export interface AvistamentoParaAutor {
  id: string
  vistoEm: string
  registradoEm: string
  observacao: string | null
  bairro: string | null
  /** Distância até o ponto do caso, em metros. */
  distanciaM: number
}

/** Campo do formulário multipart em POST /casos/:id/fotos. */
export const CAMPO_FOTO = 'foto'

/** Resposta de POST /casos/:id/fotos. */
export interface FotoEnviada {
  id: string
  /** Relativo ao endereço da API, por exemplo /fotos/<id>.jpg. */
  caminho: string
}

/**
 * Um item da comparação entre o caso perdido e o encontrado. A distância e o
 * tempo vêm em número; os atributos, com o valor de cada lado.
 */
export type Comparacao =
  | { atributo: 'porte'; perdido: Porte; encontrado: Porte }
  | { atributo: 'cor'; perdido: Cor; encontrado: Cor }
  | { atributo: 'coleira'; perdido: Coleira; encontrado: Coleira }
  | { atributo: 'distancia'; metros: number }
  /** Dias entre o sumiço e o achado; negativo quando foi achado antes de sumir. */
  | { atributo: 'tempo'; dias: number }

export type AtributoComparado = Comparacao['atributo']

/** Item de GET /casos/:id/pistas: o outro lado de um par, visto por quem publicou. */
export interface Pista {
  id: string
  veredito: VereditoPareamento
  distanciaM: number
  diasDiferenca: number
  batem: Comparacao[]
  divergem: Comparacao[]
  /** O caso do outro lado, com o que já é público no mural. */
  outro: {
    id: string
    tipo: TipoCaso
    bairro: string | null
    publicadoEm: string
    animal: AnimalPublico
    foto: string | null
  }
}

/** Corpo de POST /casos/:id/pistas/:pistaId/veredito. Confirmar vem com a verificação (F6). */
export interface NovoVereditoDaPista {
  veredito: 'descartado'
}
