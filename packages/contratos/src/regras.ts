/**
 * Regras numéricas que a API e o aplicativo precisam concordar.
 *
 * O raio padrão de 1,6 km vem de análise de dados de abrigo (Kremer, 2021): 70%
 * dos cães recuperados estavam a menos de 1,6 km de casa. É ponto de partida, a
 * validar em Santarém, e por isso a API aceita trocá-lo por variável de ambiente.
 */
export const RAIO = {
  minimoM: 500,
  padraoM: 1600,
  maximoM: 5000,
  /** Degraus que o botão "Aumentar" do mural percorre. */
  degrausM: [1600, 3000, 5000],
} as const

/**
 * Foto do animal. O aplicativo reduz antes de enviar e a API recusa o que passar
 * do limite: publicar um caso precisa caber em 1 MB de dados, com a foto (RNF2).
 */
export const FOTO = {
  maximoBytes: 900_000,
  /** Largura para a qual o aplicativo reduz a foto antes de enviar. */
  larguraMaximaPx: 1080,
  maximoPorCaso: 3,
} as const

/**
 * Pareamento determinístico (F5). Os limites são explicáveis em uma frase cada,
 * e é isso que a tela de pistas mostra: nenhuma nota, só o que bateu e o que não.
 */
export const PAREAMENTO = {
  /** Candidato só até aqui, a regra RN7. */
  raioMaximoM: RAIO.maximoM,
  /** Até esta distância o par ganha um ponto a favor: é onde aparecem 7 de 10 cães. */
  distanciaQueBateM: RAIO.padraoM,
  /** Achado até um dia antes do sumiço declarado ainda bate: memória e relógio erram. */
  diasAntesQueAindaBatem: 1,
  /** Achado até um mês depois do sumiço bate; depois disso, já não conta a favor. */
  diasDepoisQueBatem: 30,
} as const

/**
 * Reivindicação (F6). O teto de pendentes protege o autor de inundação, e o mesmo
 * telefone não reivindica de novo um caso que já o recusou: recusa repetida viraria
 * oráculo para chutar as respostas.
 */
export const REIVINDICACAO = {
  maximoPendentesPorCaso: 5,
} as const

/**
 * Normalização e conferência de telefone brasileiro (DDD com 2 dígitos + 8 ou 9 dígitos).
 */
export function normalizarTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '')
}

export function chaveDoTelefone(telefone: string): string {
  const digitos = normalizarTelefone(telefone)
  if (digitos.length < 10) return digitos
  const ddd = digitos.slice(0, 2)
  const ultimos8 = digitos.slice(-8)
  return `${ddd}${ultimos8}`
}

export const TELEFONE = {
  expressao: /^\d{10,11}$/,
  normalizar: normalizarTelefone,
  chave: chaveDoTelefone,
} as const

/**
 * Tarefa diária de cobrança, expiração e anonimização (F8, RN8). O horário mora
 * aqui: a ação agendada do GitHub, a documentação e o artigo derivam dele, e um
 * teste compara o cron do arquivo da ação com este valor.
 */
export const TAREFA_DIARIA = {
  /** 11:00 UTC é 08:00 em Santarém (UTC-3, sem horário de verão). */
  cronUtc: '0 11 * * *',
  horaLocal: '08:00',
  fuso: 'America/Santarem',
  /** Caso encerrado há este tempo perde nome e telefone de quem publicou e reivindicou (LGPD). */
  diasAteAnonimizar: 30,
} as const

/**
 * Telefone, WhatsApp ou link digitado em texto que fica público (relato, observação,
 * enunciado de pergunta) furaria o contato mediado (RNF4). A API recusa e o
 * aplicativo avisa antes de enviar, com o mesmo padrão.
 */
export const PARECE_CONTATO = /(\d[\s().-]*){8,}|whats|zap\b|wa\.me|https?:\/\/|www\./i
