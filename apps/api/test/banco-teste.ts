const BASE = process.env.DATABASE_URL_BASE ?? 'postgresql://bicho:bicho@localhost:5432'

// cada execução paralela (outra árvore de trabalho) usa o seu, porque o preparo o
// apaga e recria do zero
export const NOME_BANCO_TESTE = process.env.NOME_BANCO_TESTE ?? 'achei_um_bicho_teste'
export const URL_BANCO_ADMIN = `${BASE}/achei_um_bicho`
export const URL_BANCO_TESTE = `${BASE}/${NOME_BANCO_TESTE}`
