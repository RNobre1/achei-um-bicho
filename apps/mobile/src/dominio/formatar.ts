const MINUTO = 60_000
const HORA = 60 * MINUTO
const DIA = 24 * HORA
const SEMANA = 7 * DIA

/** Abaixo disto a distância deixa de fazer sentido: o GPS do celular erra mais que isso. */
const LIMIAR_AQUI_PERTO_M = 50

/** "850 m", "1,6 km". Como está no protótipo. */
export function formatarDistancia(metros: number): string {
  if (metros < LIMIAR_AQUI_PERTO_M) return 'aqui perto'
  if (metros < 950) return `${Math.round(metros / 10) * 10} m`
  const km = Math.round(metros / 100) / 10
  // vírgula à mão: o suporte a Intl no Hermes varia conforme a plataforma
  return `${String(km).replace('.', ',')} km`
}

/** "há 5 min", "ontem", "há 2 dias". */
export function formatarTempoDesde(iso: string, agora: Date = new Date()): string {
  const passado = agora.getTime() - new Date(iso).getTime()
  if (passado < MINUTO) return 'agora mesmo'
  if (passado < HORA) return `há ${Math.floor(passado / MINUTO)} min`
  if (passado < DIA) return `há ${Math.floor(passado / HORA)} h`
  if (passado < 2 * DIA) return 'ontem'
  if (passado < 14 * DIA) return `há ${Math.floor(passado / DIA)} dias`
  return `há ${Math.floor(passado / SEMANA)} semanas`
}
