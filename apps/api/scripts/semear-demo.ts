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

const API_URL = (process.env.API_URL ?? 'http://localhost:3333').replace(/\/+$/, '')
// Unidade Tapajós da UFOPA (Rua Vera Paz, Salé), segundo o OpenStreetMap
const UFOPA_TAPAJOS = '-2.4191,-54.7408'
const [latitudeCentro, longitudeCentro] = (process.env.CENTRO ?? UFOPA_TAPAJOS).split(',').map(Number)
if (!Number.isFinite(latitudeCentro) || !Number.isFinite(longitudeCentro)) {
  throw new Error(`CENTRO precisa ser "latitude,longitude"; veio "${process.env.CENTRO}"`)
}
const CENTRO = { latitude: latitudeCentro!, longitude: longitudeCentro! }
const METROS_POR_GRAU = 110574
const HORA = 60 * 60 * 1000

/** Ponto a tantos metros ao norte e a leste do CENTRO. */
function perto(norteM: number, lesteM: number) {
  return {
    latitude: CENTRO.latitude + norteM / METROS_POR_GRAU,
    longitude: CENTRO.longitude + lesteM / (METROS_POR_GRAU * Math.cos((CENTRO.latitude * Math.PI) / 180)),
  }
}

function horasAtras(horas: number) {
  return new Date(Date.now() - horas * HORA).toISOString()
}

type Tres = readonly [string, string, string]

const PERGUNTAS_TUTOR: Tres = [
  'Que sinal ele tem que não aparece na foto?',
  'Que nome ele atende?',
  'O que ele usava quando sumiu?',
]

const PERGUNTAS_ENCONTRADO: Tres = [
  'Que sinal ele tem que não aparece na foto?',
  'Como ele reage quando chamam pelo nome?',
  'O que ele usava quando sumiu?',
]

function perguntas([p1, p2, p3]: Tres, [r1, r2, r3]: Tres) {
  return [
    { enunciado: p1, respostaEsperada: r1 },
    { enunciado: p2, respostaEsperada: r2 },
    { enunciado: p3, respostaEsperada: r3 },
  ]
}

// Pensado para o roteiro do alpha: quem publicar ao vivo, do CENTRO, um cachorro
// caramelo de porte médio e com coleira vê três pistas, uma forte, uma média e uma
// fraca. Os outros casos dão variedade ao mural.
const CASOS: NovaPublicacao[] = [
  {
    tipo: 'encontrado',
    animal: { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'sem' },
    local: { ...perto(-300, 600), bairro: 'Salé', referencia: 'Perto da quadra do bairro' },
    autor: { nome: 'Quem achou no Salé', telefone: '93992345678' },
    ocorridoEm: horasAtras(20),
    relato: 'Estava assustado debaixo de um carro na rua. Está comigo, bem alimentado.',
    perguntas: perguntas(PERGUNTAS_ENCONTRADO, ['Tem uma cicatriz na orelha', 'Abana o rabo e vem', 'Estava sem nada']),
  },
  {
    tipo: 'encontrado',
    animal: { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'com' },
    local: { ...perto(-1200, 300), bairro: 'Aeroporto Velho', referencia: 'Rua de trás da escola' },
    autor: { nome: 'Vizinha do Aeroporto Velho', telefone: '93993456789' },
    ocorridoEm: horasAtras(30),
    relato: 'Apareceu no meu portão de manhã, com coleira azul e sem plaquinha.',
    perguntas: perguntas(PERGUNTAS_ENCONTRADO, ['Tem uma mancha branca no peito', 'Fica de barriga para cima', 'Coleira azul sem plaquinha']),
  },
  {
    tipo: 'encontrado',
    animal: { especie: 'cachorro', porte: 'medio', corDominante: 'malhado', coleira: 'nao_observado' },
    local: { ...perto(-3000, 1500), bairro: 'Liberdade', referencia: 'Perto do ponto de ônibus' },
    autor: { nome: 'Motorista que viu' },
    ocorridoEm: horasAtras(50),
    relato: 'Vi andando sozinho perto do ponto de ônibus. Consegui segurar e está no quintal.',
    perguntas: perguntas(PERGUNTAS_ENCONTRADO, ['Manca um pouco da pata de trás', 'Não reagiu a nenhum nome', 'Não deu para ver']),
  },
  {
    tipo: 'perdido',
    animal: { especie: 'gato', porte: 'pequeno', corDominante: 'cinza', coleira: 'sem', nome: 'Fumaça', castrado: true },
    local: { ...perto(-700, -500), bairro: 'Mapiri', referencia: 'Rua de trás do posto de saúde' },
    autor: { nome: 'Tutora da Fumaça' },
    ocorridoEm: horasAtras(60),
    relato: 'Gata castrada, muito medrosa. Deve estar escondida em algum quintal perto.',
    perguntas: perguntas(PERGUNTAS_TUTOR, ['Tem a ponta do rabo branca', 'Fumaça', 'Nada, estava sem coleira']),
  },
  {
    tipo: 'encontrado',
    animal: { especie: 'gato', porte: 'pequeno', corDominante: 'cinza', coleira: 'sem' },
    local: { ...perto(-500, -900), bairro: 'Mapiri' },
    autor: { nome: 'Quem achou a gatinha' },
    ocorridoEm: horasAtras(12),
    relato: 'Gatinha cinza miando no telhado da vizinha. Desceu e está aqui dentro.',
    perguntas: perguntas(PERGUNTAS_ENCONTRADO, ['A ponta do rabo é branca', 'Se esconde quando chamam', 'Estava sem nada']),
  },
  {
    tipo: 'perdido',
    animal: { especie: 'cachorro', porte: 'grande', corDominante: 'preto', coleira: 'com', nome: 'Thor', castrado: false },
    local: { ...perto(-1500, 1800), bairro: 'Laguinho', referencia: 'Próximo à escola estadual' },
    autor: { nome: 'Tutor do Thor', telefone: '93994567890' },
    ocorridoEm: horasAtras(80),
    relato: 'Cachorro grande, mas manso. Sumiu durante a chuva forte de domingo.',
    perguntas: perguntas(PERGUNTAS_TUTOR, ['Tem um dente da frente quebrado', 'Thor', 'Coleira azul com plaquinha']),
  },
  {
    tipo: 'perdido',
    animal: { especie: 'cachorro', porte: 'pequeno', corDominante: 'branco', coleira: 'com', nome: 'Mel', castrado: true },
    local: { ...perto(-2200, -400), bairro: 'Uruará', referencia: 'Perto da feira' },
    autor: { nome: 'Tutora da Mel', telefone: '93995678901' },
    ocorridoEm: horasAtras(26),
    relato: 'Pequena, branca, com uma mancha marrom nas costas. Saiu atrás de outro cachorro.',
    perguntas: perguntas(PERGUNTAS_TUTOR, ['Mancha marrom nas costas', 'Mel', 'Coleira rosa com guizo']),
  },
  {
    tipo: 'encontrado',
    animal: { especie: 'gato', porte: 'pequeno', corDominante: 'malhado', coleira: 'sem' },
    local: { ...perto(-2600, 2400), bairro: 'Caranazal' },
    autor: { nome: 'Quem achou o filhote' },
    ocorridoEm: horasAtras(8),
    relato: 'Filhote malhado miando na calçada. Está abrigado aqui em casa.',
    perguntas: perguntas(PERGUNTAS_ENCONTRADO, ['Tem os olhos de cores diferentes', 'Não responde a nome', 'Estava sem nada']),
  },
]

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
