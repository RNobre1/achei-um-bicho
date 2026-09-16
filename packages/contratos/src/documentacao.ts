import { VOCABULARIO, type Conjunto } from './vocabulario'

const CABECALHO = `# Vocabulário fechado

<!-- Gerado a partir de packages/contratos/src/vocabulario.ts.
     Não edite à mão: rode \`pnpm --filter @achei/contratos gerar:docs\`. -->

Valores aceitos em cada campo de escolha fechada do sistema. O mesmo conjunto vale
para a API, para as restrições do banco e para os chips das telas.
`

function secao(nome: string, c: Conjunto<string>): string {
  const linhas = c.valores.map((valor) => {
    const { rotulo, porque } = c.entradas[valor]!
    return `| \`${valor}\` | ${rotulo} | ${porque} |`
  })
  return [
    `## ${c.descricao} (\`${nome}\`)`,
    '',
    '| Valor | Rótulo | Por quê |',
    '|---|---|---|',
    ...linhas,
  ].join('\n')
}

/** Conteúdo exato de docs/vocabulario.md. */
export function gerarDocumentoVocabulario(): string {
  const secoes = Object.entries(VOCABULARIO).map(([nome, c]) =>
    secao(nome, c as Conjunto<string>),
  )
  return `${CABECALHO}\n${secoes.join('\n\n')}\n`
}
