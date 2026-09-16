import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gerarDocumentoVocabulario } from '../src/documentacao'

const destino = resolve(__dirname, '../../../docs/vocabulario.md')
writeFileSync(destino, gerarDocumentoVocabulario(), 'utf-8')
console.log(`gerado: ${destino}`)
