import { pareceContato } from '@achei/contratos'
import { registerDecorator, type ValidationOptions } from 'class-validator'

export const MENSAGEM_SEM_CONTATO =
  'Parece um telefone ou link. O contato só é liberado pelo aplicativo, depois da verificação. Datas, escreva com barra (12/11/2026).'

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
