/**
 * Identidade visual do protótipo de média fidelidade: as cores têm nome do que
 * existe na frente de Santarém, onde o Tapajós e o Amazonas correm lado a lado.
 */
export const cores = {
  tapajos: '#123E4A', // texto e superfície escura
  perdi: '#23797B', // estado "sumiu" (ajustado para contraste WCAG AA >= 4,5:1)
  achei: '#82755C', // estado "foi achado" (silte do Amazonas, escurecido para contraste WCAG AA >= 4,5:1)
  silte: '#B6AA95',
  alter: '#E2A83B', // único acento: ação principal e reencontro
  chuva: '#EEF2EE', // fundo
  traco: '#C7D0CB',
  apagado: '#5F7076',
  texto: '#16323A',
  branco: '#FFFFFF',
} as const

export const fontes = {
  titulo: 'Commissioner_700Bold',
  tituloForte: 'Commissioner_800ExtraBold',
  texto: 'IBMPlexSans_400Regular',
  textoMedio: 'IBMPlexSans_500Medium',
  textoForte: 'IBMPlexSans_600SemiBold',
  dado: 'IBMPlexMono_400Regular',
  dadoMedio: 'IBMPlexMono_500Medium',
} as const
