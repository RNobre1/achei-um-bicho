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
