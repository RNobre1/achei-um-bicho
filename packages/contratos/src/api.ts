/**
 * Formato das requisições e respostas da API. A API implementa estas interfaces e
 * o aplicativo as consome: é o contrato entre os dois, declarado uma vez só.
 */
import type {
  Coleira,
  Cor,
  Especie,
  EstadoCaso,
  MotivoDenuncia,
  Porte,
  TipoCaso,
  TipoDesfecho,
  VereditoPareamento,
  VereditoVerificacao,
} from './vocabulario'

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
  /**
   * Publicação feita pela fila sem conexão (F9): o aparelho gera o id e o código de
   * edição antes de enviar. Se a resposta se perder e a fila reenviar, a API devolve
   * o mesmo caso em vez de criar outro, e o aparelho já tem o código. Os dois vêm
   * juntos ou nenhum vem.
   */
  idCliente?: string
  codigoEdicao?: string
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

// ---------------------------------------------------------------------------
// F6 e F7 · reivindicação com verificação e contato mediado
// ---------------------------------------------------------------------------

/** Cabeçalho em que quem reivindicou prova que é a mesma pessoa, sem conta. */
export const CABECALHO_CODIGO_ACOMPANHAMENTO = 'x-codigo-acompanhamento'

/** Item de GET /casos/:id/perguntas: só o enunciado; a resposta esperada nunca sai. */
export interface PerguntaPublica {
  id: string
  ordem: number
  enunciado: string
}

/**
 * Corpo de POST /casos/:id/reivindicacoes. Quem acha que o bicho é seu (caso
 * encontrado) ou que achou o bicho de alguém (caso perdido) responde às três
 * perguntas de quem publicou. O telefone é obrigatório: é o que o autor recebe se
 * aceitar as respostas.
 */
export interface NovaReivindicacao {
  /** Exatamente uma resposta por pergunta do caso. */
  respostas: { perguntaId: string; texto: string }[]
  /**
   * A referência só é pedida de quem está com o animal: no caso perdido, quem
   * reivindica é quem achou, e é a referência dele que o tutor precisa.
   */
  pessoa: { nome: string; telefone: string; referencia?: string }
  /**
   * O caso que a própria pessoa publicou do outro lado, quando a reivindicação nasce
   * de uma pista. Com o código de edição dele, o aceite confirma o par e leva os dois
   * casos a em_contato.
   */
  casoProprio?: { id: string; codigoEdicao: string }
}

/** Resposta de POST /casos/:id/reivindicacoes. O código só aparece aqui, uma vez. */
export interface ReivindicacaoRegistrada {
  id: string
  veredito: VereditoVerificacao
  codigoAcompanhamento: string
}

/**
 * Contato liberado depois que o autor aceita as respostas (F7). A referência é de
 * quem está com o animal; para o outro lado, vem nula.
 */
export interface ContatoLiberado {
  nome: string
  telefone: string | null
  referencia: string | null
}

/**
 * Item de GET /casos/:id/reivindicacoes, que só quem publicou vê (RN4). As
 * respostas dadas aparecem ao lado da resposta que o próprio autor cadastrou; o
 * contato de quem reivindicou só aparece depois do aceite (RN5).
 */
export interface ReivindicacaoParaAutor {
  id: string
  veredito: VereditoVerificacao
  criadoEm: string
  decididoEm: string | null
  respostas: { ordem: number; enunciado: string; respostaEsperada: string; respostaDada: string }[]
  /** Denúncias já feitas contra este telefone em qualquer caso: aparece antes do aceite. */
  denunciasDoTelefone: number
  contato: ContatoLiberado | null
}

/** Corpo de POST /casos/:id/reivindicacoes/:reivindicacaoId/veredito. */
export interface NovoVereditoDaReivindicacao {
  veredito: Exclude<VereditoVerificacao, 'pendente'>
  /** Obrigatório para aceitar quando o autor publicou sem telefone: o contato é dos dois lados. */
  telefone?: string
}

/**
 * Resposta de GET /reivindicacoes/:id, para quem reivindicou, com o código de
 * acompanhamento. O contato do autor e o ponto de referência só vêm depois do aceite.
 */
export interface SituacaoDaReivindicacao {
  id: string
  veredito: VereditoVerificacao
  caso: { id: string; tipo: TipoCaso; estado: EstadoCaso }
  contato: ContatoLiberado | null
}

/** Corpo de POST /casos/:id/denuncias. Não exige conta nem código. */
export interface NovaDenuncia {
  motivo: MotivoDenuncia
  texto?: string
  reivindicacaoId?: string
}

/** Resposta de POST /casos/:id/denuncias. */
export interface DenunciaRegistrada {
  id: string
}

// ---------------------------------------------------------------------------
// F8 · ciclo de vida do caso
// ---------------------------------------------------------------------------

/**
 * Corpo de PATCH /casos/:id, só com o caso aberto. Mudar porte, cor ou coleira
 * refaz as pistas, mas pista já decidida continua decidida. Espécie não muda: é
 * outro caso.
 */
export interface EdicaoDoCaso {
  relato?: string
  animal?: Partial<Pick<AnimalNaPublicacao, 'porte' | 'corDominante' | 'coleira' | 'nome' | 'castrado'>>
}

/** Corpo de POST /casos/:id/desfecho. Encerrar exige o desfecho (RN9). */
export interface NovoDesfecho {
  tipo: TipoDesfecho
  /** Data e hora em ISO 8601. */
  ocorridoEm: string
}

/** Resposta de GET /casos/:id/situacao, para quem publicou. */
export interface SituacaoDoCaso {
  id: string
  estado: EstadoCaso
  /** O caso está parado há DIAS_ATE_COBRANCA e espera o autor confirmar (RN8). */
  cobrancaPendente: boolean
  diasSemInteracao: number
  reivindicacoesPendentes: number
  desfecho: { tipo: TipoDesfecho; ocorridoEm: string } | null
}

/** Cabeçalho com a chave que só a ação agendada conhece. */
export const CABECALHO_CHAVE_TAREFAS = 'x-chave-tarefas'

/**
 * Resposta de POST /tarefas/ciclo-de-vida: quantos casos cada regra alcançou. Os
 * anonimizados são casos encerrados há DIAS_ATE_ANONIMIZAR cujo nome e telefone de
 * quem publicou e de quem reivindicou foram apagados.
 */
export interface CicloDeVidaExecutado {
  cobrados: number
  expirados: number
  anonimizados: number
}

/*
 * Rotas do ciclo de vida sem corpo, todas com o código de edição:
 * POST /casos/:id/confirmacao  — o autor diz que ainda procura; limpa a cobrança.
 * POST /casos/:id/reabertura   — o contato não deu certo; em_contato volta ao estado
 *                                inicial do tipo do caso.
 */
