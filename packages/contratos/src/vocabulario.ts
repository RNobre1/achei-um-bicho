/**
 * Vocabulário fechado do Achei um Bicho.
 *
 * Cada conjunto de valores é declarado uma única vez, aqui. Os tipos da API e do
 * aplicativo, as restrições CHECK do banco, os chips das telas e a tabela em
 * docs/vocabulario.md derivam deste arquivo. Acrescentar um valor em qualquer
 * outro lugar é abrir uma divergência que o compilador não alcança.
 *
 * O rótulo mora na mesma entrada que o valor de propósito: não existe valor novo
 * sem texto de tela, nem texto de tela sem valor.
 */

export interface Entrada {
  /** Texto mostrado ao usuário. */
  rotulo: string
  /** Por que este valor existe. Obrigatório: valor sem motivo é candidato a sair. */
  porque: string
}

export interface Conjunto<V extends string> {
  descricao: string
  entradas: Record<V, Entrada>
  valores: readonly V[]
}

function conjunto<const E extends Record<string, Entrada>>(
  descricao: string,
  entradas: E,
): Conjunto<Extract<keyof E, string>> {
  return {
    descricao,
    entradas,
    valores: Object.keys(entradas) as Extract<keyof E, string>[],
  }
}

export const ESPECIE = conjunto('Espécie do animal', {
  cachorro: {
    rotulo: 'Cachorro',
    porque: 'A maior parte dos casos nos grupos da cidade é de cachorro.',
  },
  gato: {
    rotulo: 'Gato',
    porque: 'Gato some com frequência e quase nunca volta sozinho para casa.',
  },
})

export const PORTE = conjunto('Porte do animal', {
  pequeno: {
    rotulo: 'Pequeno',
    porque: 'Três faixas é o que dá para dizer de longe, sem medir o animal.',
  },
  medio: {
    rotulo: 'Médio',
    porque: 'Faixa do vira-lata típico, que é a maioria dos casos em Santarém.',
  },
  grande: {
    rotulo: 'Grande',
    porque: 'Separa os animais que quem encontra costuma ter receio de abordar.',
  },
})

export const COR = conjunto('Cor que mais aparece no animal', {
  caramelo: {
    rotulo: 'Caramelo',
    porque: 'É a cor mais comum entre os vira-latas da região.',
  },
  preto: {
    rotulo: 'Preto',
    porque: 'Cor dominante fácil de reconhecer a distância, inclusive à noite.',
  },
  branco: {
    rotulo: 'Branco',
    porque: 'Cor dominante fácil de reconhecer, mesmo com manchas pequenas.',
  },
  malhado: {
    rotulo: 'Malhado',
    porque: 'Cobre os animais de duas ou mais cores sem obrigar a descrever cada uma.',
  },
  cinza: {
    rotulo: 'Cinza',
    porque: 'Aparece bastante em gatos e não se confunde com preto nem branco.',
  },
})

export const COLEIRA = conjunto('Situação da coleira', {
  com: {
    rotulo: 'Com coleira',
    porque: 'Coleira indica que o animal tem casa e ajuda a separar perdido de abandonado.',
  },
  sem: {
    rotulo: 'Sem coleira',
    porque: 'Informação útil para o pareamento, porque coleira pode cair ou ser tirada.',
  },
  nao_observado: {
    rotulo: 'Não deu para ver',
    porque: 'Quem viu de longe não deve ser obrigado a inventar uma resposta.',
  },
})

export const TIPO_CASO = conjunto('Lado do caso', {
  perdido: {
    rotulo: 'Sumiu',
    porque: 'Publicado por quem perdeu o animal e está procurando.',
  },
  encontrado: {
    rotulo: 'Foi achado',
    porque: 'Publicado por quem encontrou um animal na rua e quer devolver.',
  },
})

export const ESTADO_CASO = conjunto('Ciclo de vida do caso', {
  procurando: {
    rotulo: 'Procurando',
    porque: 'Estado inicial de quem perdeu: o caso aparece no mural e recebe pistas.',
  },
  abrigado_temporariamente: {
    rotulo: 'Abrigado por alguém',
    porque: 'Estado inicial de quem achou: o animal está seguro, esperando o tutor.',
  },
  em_contato: {
    rotulo: 'Em contato',
    porque: 'As duas partes já se falaram depois da verificação; o caso sai do alcance público.',
  },
  resolvido: {
    rotulo: 'Resolvido',
    porque: 'O autor informou o desfecho e o caso deixa de aparecer no mural.',
  },
  expirado: {
    rotulo: 'Expirado',
    porque: 'Caso sem interação sai do mural sozinho para não virar anúncio morto.',
  },
})

export const TIPO_DESFECHO = conjunto('Como o caso terminou', {
  voltou_para_casa: {
    rotulo: 'Voltou para casa',
    porque: 'É o resultado que o produto existe para produzir, e o que o artigo mede.',
  },
  foi_adotado: {
    rotulo: 'Foi adotado',
    porque: 'Quando o tutor não aparece, quem acolheu pode ficar com o animal.',
  },
  nao_encontrado: {
    rotulo: 'Não foi encontrado',
    porque: 'Registrar o fracasso também é dado: sem ele, a taxa de sucesso mente.',
  },
})

export const VEREDITO_VERIFICACAO = conjunto('Decisão sobre uma reivindicação', {
  pendente: {
    rotulo: 'Aguardando resposta',
    porque: 'A pessoa respondeu as perguntas e o autor do caso ainda não conferiu.',
  },
  aceita: {
    rotulo: 'Aceita',
    porque: 'O autor conferiu as respostas e liberou o contato entre as partes.',
  },
  recusada: {
    rotulo: 'Recusada',
    porque: 'As respostas não bateram; o contato continua fechado.',
  },
})

export const VEREDITO_PAREAMENTO = conjunto('Decisão sobre uma pista', {
  pendente: {
    rotulo: 'Pode ser ele',
    porque: 'O sistema aproximou dois casos e ninguém decidiu ainda.',
  },
  confirmado: {
    rotulo: 'É o mesmo bicho',
    porque: 'Uma pessoa confirmou; o sistema nunca confirma sozinho.',
  },
  descartado: {
    rotulo: 'Não é',
    porque: 'Descartar evita que a mesma pista errada volte a aparecer.',
  },
})

export const VOCABULARIO = {
  especie: ESPECIE,
  porte: PORTE,
  cor: COR,
  coleira: COLEIRA,
  tipoCaso: TIPO_CASO,
  estadoCaso: ESTADO_CASO,
  tipoDesfecho: TIPO_DESFECHO,
  vereditoVerificacao: VEREDITO_VERIFICACAO,
  vereditoPareamento: VEREDITO_PAREAMENTO,
} as const

export type NomeConjunto = keyof typeof VOCABULARIO

type ValoresDe<C> = C extends Conjunto<infer V> ? V : never

export type Especie = ValoresDe<typeof ESPECIE>
export type Porte = ValoresDe<typeof PORTE>
export type Cor = ValoresDe<typeof COR>
export type Coleira = ValoresDe<typeof COLEIRA>
export type TipoCaso = ValoresDe<typeof TIPO_CASO>
export type EstadoCaso = ValoresDe<typeof ESTADO_CASO>
export type TipoDesfecho = ValoresDe<typeof TIPO_DESFECHO>
export type VereditoVerificacao = ValoresDe<typeof VEREDITO_VERIFICACAO>
export type VereditoPareamento = ValoresDe<typeof VEREDITO_PAREAMENTO>

/** Em que estado cada lado do caso nasce. */
export const ESTADO_INICIAL: Record<TipoCaso, EstadoCaso> = {
  perdido: 'procurando',
  encontrado: 'abrigado_temporariamente',
}

/** Valor e rótulo na ordem declarada: é o que as telas usam para montar chips. */
export function opcoes<V extends string>(c: Conjunto<V>): { valor: V; rotulo: string }[] {
  return c.valores.map((valor) => ({ valor, rotulo: c.entradas[valor].rotulo }))
}
