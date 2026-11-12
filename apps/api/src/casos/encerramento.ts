import { TAREFA_DIARIA } from '@achei/contratos'
import { Prisma } from '@prisma/client'

const DIA_MS = 24 * 60 * 60 * 1000

/** Encerrado antes disto, o caso sai do ar e perde os dados pessoais na tarefa diária. */
export function limiteDeAnonimizacao(agora: Date = new Date()): Date {
  return new Date(agora.getTime() - TAREFA_DIARIA.diasAteAnonimizar * DIA_MS)
}

/**
 * Caso `c` encerrado até `limite`: resolvido com desfecho registrado até lá, ou
 * expirado sem ação do autor desde então. A mesma condição tira o caso do ar e
 * escolhe quem a tarefa anonimiza; se divergissem, a área do caso anonimizado
 * (centro já deslocado) voltaria a ser servida com um segundo deslocamento.
 */
export function encerradoAte(limite: Date): Prisma.Sql {
  return Prisma.sql`(
    (
      c.estado = 'resolvido'
      AND EXISTS (SELECT 1 FROM desfecho d WHERE d.caso_id = c.id AND d.registrado_em <= ${limite})
    )
    OR (c.estado = 'expirado' AND c.ultima_interacao_em <= ${limite})
  )`
}
