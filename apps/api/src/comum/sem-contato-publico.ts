import { MENSAGEM_SEM_CONTATO, pareceContato } from '@achei/contratos'
import { registerDecorator, type ValidationOptions } from 'class-validator'

export { MENSAGEM_SEM_CONTATO }

/**
 * Garante que textos públicos (nome, bairro, relato, observação, enunciado de pergunta)
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
          return !pareceContato(valor)
        },
      },
    })
  }
}
