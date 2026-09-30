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
