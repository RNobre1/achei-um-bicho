import { TAREFA_DIARIA } from '@achei/contratos'

// en-CA formata como AAAA-MM-DD, que compara certo como texto
const formato = new Intl.DateTimeFormat('en-CA', {
  timeZone: TAREFA_DIARIA.fuso,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Dia do calendário de Santarém (AAAA-MM-DD). O aplicativo manda o dia escolhido como
 * meio-dia, então datas de dias diferentes se comparam pelo dia, não pelo instante.
 */
export function diaEmSantarem(instante: Date): string {
  return formato.format(instante)
}
