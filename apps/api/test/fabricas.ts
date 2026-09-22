import { CENTRO_SANTAREM } from './pontos'

const UM_DIA = 24 * 60 * 60 * 1000

/** Corpo válido de publicação, no formato que o aplicativo envia. */
export function casoValido(sobrescrever: Record<string, unknown> = {}) {
  return {
    tipo: 'perdido',
    animal: {
      especie: 'cachorro',
      porte: 'medio',
      corDominante: 'caramelo',
      coleira: 'com',
      nome: 'Nego',
      castrado: true,
    },
    local: {
      latitude: CENTRO_SANTAREM.latitude,
      longitude: CENTRO_SANTAREM.longitude,
      bairro: 'Aparecida',
      referencia: 'Trav. Barjonas de Miranda, perto da praça',
    },
    autor: { nome: 'Tutor do Nego', telefone: '93991234567' },
    ocorridoEm: new Date(Date.now() - 2 * UM_DIA).toISOString(),
    relato: 'Sumiu no fim da tarde de sábado, quando o portão ficou aberto.',
    perguntas: [
      { enunciado: 'Qual sinal ele tem que não aparece na foto?', respostaEsperada: 'Falta um pedaço da orelha esquerda' },
      { enunciado: 'Que nome ele atende?', respostaEsperada: 'Nego' },
      { enunciado: 'O que ele usava quando sumiu?', respostaEsperada: 'Coleira vermelha de nylon' },
    ],
    ...sobrescrever,
  }
}
