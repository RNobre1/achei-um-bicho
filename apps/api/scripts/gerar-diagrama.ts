/**
 * Regrava docs/uml/classes.drawio a partir do schema e do vocabulário. O teste de
 * frescor reprova enquanto o arquivo em disco estiver diferente do gerado.
 *
 *     pnpm --filter @achei/api gerar:diagrama
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ARQUIVO_DIAGRAMA, gerarDiagramaClasses } from '../src/uml/diagrama-classes'

const destino = resolve(__dirname, '../../..', ARQUIVO_DIAGRAMA)
writeFileSync(destino, gerarDiagramaClasses(), 'utf-8')
console.log(ARQUIVO_DIAGRAMA)
