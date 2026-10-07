/**
 * Publica casos de demonstração pela própria API, para o mural não abrir vazio em
 * apresentação e em teste manual do aplicativo. Passa pela mesma validação que o
 * aplicativo enfrenta: se um caso daqui for recusado, o contrato mudou.
 *
 *     pnpm --filter @achei/api semear:demo            # API em http://localhost:3333
 *     API_URL=http://outro:3333 pnpm --filter @achei/api semear:demo
 *
 * Os casos são fictícios. Os bairros são de Santarém e os pontos ficam a poucos
 * quilômetros da praça central, mas não são endereços de ninguém.
 */
import type { CasoPublicado, NovaPublicacao } from '@achei/contratos'

const API_URL = (process.env.API_URL ?? 'http://localhost:3333').replace(/\/+$/, '')
const CENTRO = { latitude: -2.4385, longitude: -54.7085 }
const METROS_POR_GRAU = 110574
const HORA = 60 * 60 * 1000

/** Ponto a tantos metros ao norte e a leste da praça central. */
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

// Pensado para o roteiro do alpha: quem publicar ao vivo um cachorro caramelo,
// porte médio e com coleira, sumido perto da praça central, vê três pistas, uma
// forte, uma média e uma fraca. Os outros casos dão variedade ao mural.
const CASOS: NovaPublicacao[] = [
  {
    tipo: 'encontrado',
    animal: { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'sem' },
    local: { ...perto(900, 350), bairro: 'Prainha', referencia: 'Orla, perto do mercadão' },
    autor: { nome: 'Quem achou na orla', telefone: '93992345678' },
    ocorridoEm: horasAtras(20),
    relato: 'Estava assustado debaixo de um banco da orla. Está comigo, bem alimentado.',
    perguntas: perguntas(PERGUNTAS_ENCONTRADO, ['Tem uma cicatriz na orelha', 'Abana o rabo e vem', 'Estava sem nada']),
  },
  {
    tipo: 'encontrado',
    animal: { especie: 'cachorro', porte: 'medio', corDominante: 'caramelo', coleira: 'com' },
    local: { ...perto(-1300, 450), bairro: 'Santa Clara', referencia: 'Rua de trás da escola' },
    autor: { nome: 'Vizinha da Santa Clara', telefone: '93993456789' },
    ocorridoEm: horasAtras(30),
    relato: 'Apareceu no meu portão de manhã, com coleira azul e sem plaquinha.',
    perguntas: perguntas(PERGUNTAS_ENCONTRADO, ['Tem uma mancha branca no peito', 'Fica de barriga para cima', 'Coleira azul sem plaquinha']),
  },
  {
    tipo: 'encontrado',
    animal: { especie: 'cachorro', porte: 'medio', corDominante: 'malhado', coleira: 'nao_observado' },
    local: { ...perto(-3300, -900), bairro: 'Esperança', referencia: 'Avenida Cuiabá' },
    autor: { nome: 'Motorista que viu' },
    ocorridoEm: horasAtras(50),
    relato: 'Vi andando sozinho na avenida, perto do ponto de ônibus. Consegui segurar e está no quintal.',
    perguntas: perguntas(PERGUNTAS_ENCONTRADO, ['Manca um pouco da pata de trás', 'Não reagiu a nenhum nome', 'Não deu para ver']),
  },
  {
    tipo: 'perdido',
    animal: { especie: 'gato', porte: 'pequeno', corDominante: 'cinza', coleira: 'sem', nome: 'Fumaça', castrado: true },
    local: { ...perto(-600, 500), bairro: 'Santa Clara', referencia: 'Rua de trás do posto de saúde' },
    autor: { nome: 'Tutora da Fumaça' },
    ocorridoEm: horasAtras(60),
    relato: 'Gata castrada, muito medrosa. Deve estar escondida em algum quintal perto.',
    perguntas: perguntas(PERGUNTAS_TUTOR, ['Tem a ponta do rabo branca', 'Fumaça', 'Nada, estava sem coleira']),
  },
  {
    tipo: 'encontrado',
    animal: { especie: 'gato', porte: 'pequeno', corDominante: 'cinza', coleira: 'sem' },
    local: { ...perto(-450, 900), bairro: 'Santa Clara' },
    autor: { nome: 'Quem achou a gatinha' },
    ocorridoEm: horasAtras(12),
    relato: 'Gatinha cinza miando no telhado da vizinha. Desceu e está aqui dentro.',
    perguntas: perguntas(PERGUNTAS_ENCONTRADO, ['A ponta do rabo é branca', 'Se esconde quando chamam', 'Estava sem nada']),
  },
  {
    tipo: 'perdido',
    animal: { especie: 'cachorro', porte: 'grande', corDominante: 'preto', coleira: 'com', nome: 'Thor', castrado: false },
    local: { ...perto(1400, -1500), bairro: 'Aldeia', referencia: 'Próximo à escola estadual' },
    autor: { nome: 'Tutor do Thor', telefone: '93994567890' },
    ocorridoEm: horasAtras(80),
    relato: 'Cachorro grande, mas manso. Sumiu durante a chuva forte de domingo.',
    perguntas: perguntas(PERGUNTAS_TUTOR, ['Tem um dente da frente quebrado', 'Thor', 'Coleira azul com plaquinha']),
  },
  {
    tipo: 'perdido',
    animal: { especie: 'cachorro', porte: 'pequeno', corDominante: 'branco', coleira: 'com', nome: 'Mel', castrado: true },
    local: { ...perto(-2100, -300), bairro: 'Fátima', referencia: 'Perto da feira' },
    autor: { nome: 'Tutora da Mel', telefone: '93995678901' },
    ocorridoEm: horasAtras(26),
    relato: 'Pequena, branca, com uma mancha marrom nas costas. Saiu atrás de outro cachorro.',
    perguntas: perguntas(PERGUNTAS_TUTOR, ['Mancha marrom nas costas', 'Mel', 'Coleira rosa com guizo']),
  },
  {
    tipo: 'encontrado',
    animal: { especie: 'gato', porte: 'pequeno', corDominante: 'malhado', coleira: 'sem' },
    local: { ...perto(-2600, 1800), bairro: 'Interventoria' },
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
