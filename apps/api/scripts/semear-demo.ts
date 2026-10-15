/**
 * Publica casos de demonstração pela própria API, para o mural não abrir vazio em
 * apresentação e em teste manual do aplicativo. Passa pela mesma validação que o
 * aplicativo enfrenta: se um caso daqui for recusado, o contrato mudou.
 *
 *     pnpm --filter @achei/api semear:demo            # API em http://localhost:3333
 *     API_URL=http://outro:3333 pnpm --filter @achei/api semear:demo
 *     CENTRO=-2.4385,-54.7085 pnpm --filter @achei/api semear:demo   # outro ponto
 *
 * Os casos são fictícios e ficam a poucos quilômetros do CENTRO, que por padrão é a
 * Unidade Tapajós da UFOPA, onde o alpha é apresentado: o mural do celular na sala
 * precisa mostrar casos dentro do raio de 1,6 km. Os bairros são de Santarém, mas
 * os pontos não são endereços de ninguém. O campus fica na beira do rio, por isso
 * os casos estão ao sul e aos lados, nunca ao norte.
 */
import type { CasoPublicado, NovaPublicacao } from '@achei/contratos'
import { casosDeDemonstracao } from './casos-de-demonstracao'

const API_URL = (process.env.API_URL ?? 'http://localhost:3333').replace(/\/+$/, '')
// Unidade Tapajós da UFOPA (Rua Vera Paz, Salé), segundo o OpenStreetMap
const UFOPA_TAPAJOS = '-2.4191,-54.7408'
const [latitudeCentro, longitudeCentro] = (process.env.CENTRO ?? UFOPA_TAPAJOS).split(',').map(Number)
if (!Number.isFinite(latitudeCentro) || !Number.isFinite(longitudeCentro)) {
  throw new Error(`CENTRO precisa ser "latitude,longitude"; veio "${process.env.CENTRO}"`)
}
const CENTRO = { latitude: latitudeCentro!, longitude: longitudeCentro! }
const CASOS = casosDeDemonstracao(CENTRO, new Date())

async function publicar(caso: NovaPublicacao): Promise<CasoPublicado> {
  const resposta = await fetch(`${API_URL}/casos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(caso),
  })
  if (!resposta.ok) throw new Error(`POST /casos respondeu ${resposta.status}: ${await resposta.text()}`)
  return (await resposta.json()) as CasoPublicado
}

async function main() {
  for (const caso of CASOS) {
    const publicado = await publicar(caso)
    const quem = caso.animal.nome ?? `${caso.animal.especie} sem nome`
    // o código só aparece aqui, uma vez: é com ele que a equipe edita ou encerra o caso
    console.log(`${publicado.tipo.padEnd(10)} ${quem.padEnd(18)} ${(caso.local.bairro ?? '').padEnd(14)} ${publicado.codigoEdicao}`)
  }
  console.log(`${CASOS.length} casos publicados em ${API_URL}`)
}

main().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro)
  process.exit(1)
})
