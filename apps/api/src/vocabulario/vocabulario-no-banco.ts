import { VOCABULARIO, type NomeConjunto } from '@achei/contratos'

/** Primeira linha de toda migração gerada; é por ela que a guarda as reconhece. */
export const MARCA_MIGRACAO_GERADA = '-- Gerado a partir de packages/contratos/src/vocabulario.ts'

export interface ColunaComVocabulario {
  tabela: string
  coluna: string
  conjunto: NomeConjunto
}

/**
 * Quais colunas do banco só aceitam valores do vocabulário fechado.
 * Coluna nova de escolha fechada entra aqui, e em nenhum outro lugar.
 */
export const COLUNAS_COM_VOCABULARIO: readonly ColunaComVocabulario[] = [
  { tabela: 'animal', coluna: 'especie', conjunto: 'especie' },
  { tabela: 'animal', coluna: 'porte', conjunto: 'porte' },
  { tabela: 'animal', coluna: 'cor_dominante', conjunto: 'cor' },
  { tabela: 'animal', coluna: 'coleira', conjunto: 'coleira' },
  { tabela: 'caso', coluna: 'tipo', conjunto: 'tipoCaso' },
  { tabela: 'caso', coluna: 'estado', conjunto: 'estadoCaso' },
  { tabela: 'desfecho', coluna: 'tipo', conjunto: 'tipoDesfecho' },
  { tabela: 'tentativa_verificacao', coluna: 'veredito', conjunto: 'vereditoVerificacao' },
  { tabela: 'pareamento', coluna: 'veredito', conjunto: 'vereditoPareamento' },
]

function literal(valor: string): string {
  return `'${valor.replace(/'/g, "''")}'`
}

/**
 * Conteúdo da migração de vocabulário. Cada restrição é removida antes de ser
 * recriada, então a mesma forma serve quando um valor entra ou sai do manifesto.
 */
export function gerarSqlVocabulario(): string {
  const comandos = COLUNAS_COM_VOCABULARIO.flatMap(({ tabela, coluna, conjunto }) => {
    const restricao = `ck_${tabela}_${coluna}`
    const valores = VOCABULARIO[conjunto].valores.map(literal).join(', ')
    return [
      `ALTER TABLE "${tabela}" DROP CONSTRAINT IF EXISTS "${restricao}";`,
      `ALTER TABLE "${tabela}" ADD CONSTRAINT "${restricao}" CHECK ("${coluna}" IN (${valores}));`,
    ]
  })
  return [
    MARCA_MIGRACAO_GERADA,
    '-- Não edite à mão: rode `pnpm --filter @achei/api gerar:vocabulario`.',
    '',
    ...comandos,
    '',
  ].join('\n')
}
