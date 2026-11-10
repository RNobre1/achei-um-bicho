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

function normalizarTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '')
}

function chaveDoTelefone(telefone: string): string {
  const digitos = normalizarTelefone(telefone)
  if (digitos.length < 10) return digitos
  const ddd = digitos.slice(0, 2)
  const ultimos8 = digitos.slice(-8)
  return `${ddd}${ultimos8}`
}

/**
 * Validação, mensagem de erro, normalização e chave de telefone brasileiro.
 */
export const TELEFONE = {
  expressao: /^\d{10,11}$/,
  mensagem: 'Telefone com DDD: 10 ou 11 dígitos',
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
 * Limites de tamanho para campos de texto em todo o sistema (RNF2 e integridade).
 */
export const LIMITES_DE_TEXTO = {
  nomeAnimal: 60,
  bairro: 80,
  referencia: 160,
  nomePessoa: 80,
  telefone: 20,
  enunciado: 160,
  resposta: 160,
  relato: 600,
  observacao: 500,
  textoDenuncia: 500,
} as const

/**
 * Telefone, WhatsApp ou link digitado em texto que fica público (relato, observação,
 * enunciado de pergunta) furaria o contato mediado (RNF4). A API recusa e o
 * aplicativo avisa antes de enviar, com o mesmo padrão.
 */
export const PARECE_CONTATO = /(\d[\s().-]*){8,}|whats|zap\b|wa\.me|https?:\/\/|www\./i

/**
 * Mensagem única mostrada antes do envio quando o relato ou enunciado contém
 * telefone, WhatsApp ou link (RNF4).
 */
export const MENSAGEM_AVISO_CONTATO =
  'O relato ou uma das perguntas parece conter telefone, WhatsApp ou link. Lembre-se que o contato só é liberado após a verificação.'

const ALFABETO_EDICAO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const TAMANHO_BLOCO_EDICAO = 4
const QUANTIDADE_BLOCOS_EDICAO = 2
const PADRAO_BLOCO_EDICAO = `[${ALFABETO_EDICAO}]{${TAMANHO_BLOCO_EDICAO}}`
const EXPRESSAO_CODIGO_EDICAO = new RegExp(
  `^${Array.from({ length: QUANTIDADE_BLOCOS_EDICAO }, () => PADRAO_BLOCO_EDICAO).join('-')}$`
)

/**
 * Código de edição de casos publicados sem conta (F9). Sorteado pelo servidor
 * ou pelo aparelho com gerador criptográfico, no formato XXXX-XXXX.
 * Sem 0/O e 1/I/L, que se confundem quando a pessoa anota à mão ou dita o código.
 */
export const CODIGO_EDICAO = {
  alfabeto: ALFABETO_EDICAO,
  tamanhoBloco: TAMANHO_BLOCO_EDICAO,
  quantidadeBlocos: QUANTIDADE_BLOCOS_EDICAO,
  formato: 'XXXX-XXXX',
  padrao: EXPRESSAO_CODIGO_EDICAO,
  expressaoRegular: EXPRESSAO_CODIGO_EDICAO,
} as const

/**
 * Gera um código de edição sorteando os caracteres do alfabeto com o gerador fornecido.
 */
export function gerarCodigoEdicao(sortear: (maximoExclusivo: number) => number): string {
  const blocos: string[] = []
  for (let b = 0; b < CODIGO_EDICAO.quantidadeBlocos; b++) {
    let bloco = ''
    for (let i = 0; i < CODIGO_EDICAO.tamanhoBloco; i++) {
      bloco += CODIGO_EDICAO.alfabeto[sortear(CODIGO_EDICAO.alfabeto.length)]
    }
    blocos.push(bloco)
  }
  return blocos.join('-')
}

/**
 * Avalia se um texto parece conter dados de contato (telefone, whatsapp, links),
 * excetuando datas (DD-MM-AAAA, DD.MM.AAAA, AAAA-MM-DD), CEPs (NNNNN-NNN)
 * e microchips de 15 dígitos.
 */
export function pareceContato(texto: string): boolean {
  if (!texto) return false

  const textoLimpo = texto
    .replace(/\b\d{2}[.-]\d{2}[.-]\d{4}\b/g, '')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
    .replace(/\b\d{5}-\d{3}\b/g, '')
    .replace(/(?<!\d)\d{15}(?!\d)/g, '')

  return PARECE_CONTATO.test(textoLimpo)
}
