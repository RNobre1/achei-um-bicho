import { COR, ESPECIE, PORTE, RAIO, type AnimalPublico, type Coleira } from '@achei/contratos'
import { formatarDistancia } from './formatar'

/** Próximo degrau do botão "Aumentar"; depois do último, volta ao padrão. */
export function proximoRaio(atual: number): number {
  const proximo = RAIO.degrausM.find((degrau) => degrau > atual)
  return proximo ?? RAIO.padraoM
}

export function nomeDoAnimal(animal: Pick<AnimalPublico, 'especie' | 'nome'>): string {
  return animal.nome ?? `${ESPECIE.entradas[animal.especie].rotulo} sem nome`
}

// no card a coleira entra no meio da frase, então o texto é outro, mas as chaves são
// as do vocabulário: o Record exaustivo obriga a escrever o texto de um valor novo
const COLEIRA_NO_CARD: Record<Coleira, string> = {
  com: 'com coleira',
  sem: 'sem coleira',
  nao_observado: 'coleira não observada',
}

export function descreverAnimal(animal: Omit<AnimalPublico, 'nome'>): string {
  const porte = PORTE.entradas[animal.porte].rotulo.toLowerCase()
  const cor = COR.entradas[animal.corDominante].rotulo.toLowerCase()
  return `Porte ${porte}, ${cor}, ${COLEIRA_NO_CARD[animal.coleira]}.`
}

/**
 * Mensagem que o mural vazio oferece mandar para os vizinhos. O mural só funciona
 * se quem mora perto também estiver nele; o grupo de WhatsApp é por onde chegam.
 */
export function textoDoConvite(raioM: number): string {
  return (
    'Estou usando o Achei um Bicho, um mural de cães e gatos perdidos e encontrados aqui em Santarém. ' +
    `Agora não tem nenhum caso aberto a ${formatarDistancia(raioM)} daqui, mas se você perder ou achar um bicho, ` +
    'publique lá: o aviso chega primeiro a quem mora perto.'
  )
}
