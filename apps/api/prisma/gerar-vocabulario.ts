import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { MARCA_MIGRACAO_GERADA, gerarSqlVocabulario } from '../src/vocabulario/vocabulario-no-banco'

// Cria uma migração nova só quando o vocabulário mudou. Migração aplicada não se
// edita: a mudança entra como uma migração a mais, que recria as restrições.
const pasta = resolve(__dirname, 'migrations')
const sql = gerarSqlVocabulario()

const ultimaGerada = readdirSync(pasta, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => join(pasta, e.name, 'migration.sql'))
  .filter((arquivo) => existsSync(arquivo))
  .sort()
  .map((arquivo) => readFileSync(arquivo, 'utf-8'))
  .filter((conteudo) => conteudo.startsWith(MARCA_MIGRACAO_GERADA))
  .at(-1)

if (ultimaGerada === sql) {
  console.log('vocabulário sem mudança; nenhuma migração criada')
} else {
  const carimbo = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
  const destino = join(pasta, `${carimbo}_vocabulario`)
  mkdirSync(destino)
  writeFileSync(join(destino, 'migration.sql'), sql, 'utf-8')
  console.log(`migração criada: ${destino}`)
}
