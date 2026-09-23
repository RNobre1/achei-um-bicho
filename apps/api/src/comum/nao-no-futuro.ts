import { registerDecorator, type ValidationOptions } from 'class-validator'

/** Folga para relógio de celular adiantado, que é comum e não deve travar ninguém. */
const TOLERANCIA_MS = 5 * 60 * 1000

/** Data ISO que não pode estar no futuro: ninguém perde ou acha um bicho amanhã. */
export function NaoNoFuturo(opcoes?: ValidationOptions): PropertyDecorator {
  return (alvo, propriedade) => {
    registerDecorator({
      name: 'naoNoFuturo',
      target: alvo.constructor,
      propertyName: String(propriedade),
      options: { message: `${String(propriedade)} não pode estar no futuro`, ...opcoes },
      validator: {
        validate(valor: unknown): boolean {
          if (typeof valor !== 'string') return false
          const instante = Date.parse(valor)
          return Number.isFinite(instante) && instante <= Date.now() + TOLERANCIA_MS
        },
      },
    })
  }
}
