import { PARECE_CONTATO } from '@achei/contratos'
import { registerDecorator, type ValidationOptions } from 'class-validator'

export const MENSAGEM_SEM_CONTATO =
  'Não inclua telefone, WhatsApp ou links no texto público: o contato é liberado pelo aplicativo com segurança.'

/**
 * Garante que textos públicos (relato, observação, enunciado de pergunta)
 * não contenham telefone, WhatsApp ou link (RNF4), pois furaria o contato mediado.
 */
export function SemContatoPublico(opcoes?: ValidationOptions): PropertyDecorator {
  return (alvo, propriedade) => {
    registerDecorator({
      name: 'semContatoPublico',
      target: alvo.constructor,
      propertyName: String(propriedade),
      options: { message: MENSAGEM_SEM_CONTATO, ...opcoes },
      validator: {
        validate(valor: unknown): boolean {
          if (typeof valor !== 'string') return true
          return !PARECE_CONTATO.test(valor)
        },
      },
    })
  }
}
