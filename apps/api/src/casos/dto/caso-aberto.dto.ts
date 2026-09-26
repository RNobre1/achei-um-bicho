/**
 * O que qualquer pessoa vê ao abrir um caso. Contato, código de edição, respostas
 * de verificação e o ponto exato ficam de fora por construção: não há campo para eles.
 */
export interface CasoAberto {
  id: string
  tipo: string
  estado: string
  relato: string | null
  ocorridoEm: string
  publicadoEm: string
  animal: {
    especie: string
    porte: string
    corDominante: string
    coleira: string
    nome: string | null
    castrado: boolean | null
  }
  area: {
    latitude: number
    longitude: number
    raioM: number
    bairro: string | null
  }
}
