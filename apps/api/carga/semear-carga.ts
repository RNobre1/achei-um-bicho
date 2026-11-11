import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { validarNomeBancoCarga } from '../src/carga/validar-nome-banco-carga'

const BASE_URL = process.env.DATABASE_URL_BASE ?? 'postgresql://bicho:bicho@localhost:5432'
const NOME_BANCO = process.env.NOME_BANCO ?? 'achei_carga_d'
validarNomeBancoCarga(NOME_BANCO)
const URL_ADMIN = `${BASE_URL}/achei_um_bicho`
const URL_BANCO = `${BASE_URL}/${NOME_BANCO}`

// Praça da Matriz em Santarém
const CENTRO = { latitude: -2.4432, longitude: -54.7123 }
const TOTAL_CASOS = Number(process.env.TOTAL_CASOS ?? 200)
const RAIO_MAXIMO_M = 4500
const ANGULO_DE_OURO = 2.399963229728653

const ESPECIES = ['cachorro', 'gato'] as const
const PORTES = ['pequeno', 'medio', 'grande'] as const
const CORES = ['caramelo', 'preto', 'branco', 'malhado', 'cinza'] as const
const COLEIRAS = ['com', 'sem', 'nao_observado'] as const
const NOMES = ['Caramelo', 'Pipoca', 'Thor', 'Mel', 'Bob', 'Luna', 'Simba', 'Bidu', 'Nina', 'Totó']
const BAIRROS = ['Centro', 'Santa Clara', 'Aldeia', 'Aparecida', 'Prainha', 'Caranazal', 'Santíssimo', 'Salé']

/**
 * Ponto gerado por espiral de Fermat determinística (sem Math.random).
 * Distribuição uniforme em área ao redor do centro.
 */
function pontoDeterminista(indice: number, total: number) {
  const frac = total > 1 ? indice / (total - 1) : 0
  const distanciaM = Math.sqrt(frac) * RAIO_MAXIMO_M
  const angulo = indice * ANGULO_DE_OURO
  const deltaLat = (distanciaM * Math.cos(angulo)) / 111_000
  const deltaLon = (distanciaM * Math.sin(angulo)) / (111_000 * Math.cos((CENTRO.latitude * Math.PI) / 180))
  return {
    latitude: Number((CENTRO.latitude + deltaLat).toFixed(6)),
    longitude: Number((CENTRO.longitude + deltaLon).toFixed(6)),
    distanciaM,
  }
}

async function prepararBanco(): Promise<void> {
  const admin = new PrismaClient({ datasourceUrl: URL_ADMIN })
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${NOME_BANCO} WITH (FORCE)`)
  await admin.$executeRawUnsafe(`CREATE DATABASE ${NOME_BANCO}`)
  await admin.$disconnect()

  execSync('npx prisma migrate deploy', {
    cwd: `${__dirname}/..`,
    env: { ...process.env, DATABASE_URL: URL_BANCO },
    stdio: 'inherit',
  })
}

async function semearCasos(): Promise<void> {
  const prisma = new PrismaClient({ datasourceUrl: URL_BANCO })

  console.log(`Semeando ${TOTAL_CASOS} casos determinísticos em ${NOME_BANCO}...`)

  let casosNoRaio1600 = 0
  const TAMANHO_LOTE = 500

  for (let inicio = 0; inicio < TOTAL_CASOS; inicio += TAMANHO_LOTE) {
    const fim = Math.min(inicio + TAMANHO_LOTE, TOTAL_CASOS)
    const pessoas = []
    const animais = []
    const locaisSql = []
    const casos = []
    const perguntas = []

    for (let i = inicio; i < fim; i++) {
      const pt = pontoDeterminista(i, TOTAL_CASOS)
      if (pt.distanciaM <= 1600) casosNoRaio1600++

      const especie = ESPECIES[i % ESPECIES.length]!
      const porte = PORTES[i % PORTES.length]!
      const cor = CORES[i % CORES.length]!
      const coleira = COLEIRAS[i % COLEIRAS.length]!
      const bairro = BAIRROS[i % BAIRROS.length]!
      const nome = i % 3 === 0 ? NOMES[i % NOMES.length]! : null
      const tipo = i % 2 === 0 ? 'perdido' : 'encontrado'

      const autorId = randomUUID()
      const animalId = randomUUID()
      const localId = randomUUID()
      const casoId = randomUUID()

      pessoas.push({
        id: autorId,
        nome: `Autor ${i + 1}`,
        telefone: '93991234567',
      })

      locaisSql.push(
        `('${localId}'::uuid, ST_GeogFromText('SRID=4326;POINT(${pt.longitude} ${pt.latitude})'), '${bairro}', 'Perto da praça', 300)`,
      )

      animais.push({
        id: animalId,
        especie,
        porte,
        corDominante: cor,
        coleira,
        nome,
        castrado: i % 4 === 0,
      })

      casos.push({
        id: casoId,
        tipo,
        estado: 'procurando',
        autorId,
        animalId,
        localId,
        relato: `Caso de teste de carga número ${i + 1}`,
        ocorridoEm: new Date(Date.now() - (i + 1) * 3600 * 1000),
        publicadoEm: new Date(Date.now() - i * 1800 * 1000),
        ultimaInteracaoEm: new Date(),
      })

      perguntas.push(
        { casoId, ordem: 1, enunciado: 'Qual a cor da coleira?', respostaEsperada: 'Vermelha' },
        { casoId, ordem: 2, enunciado: 'Tem alguma mancha?', respostaEsperada: 'No rabo' },
        { casoId, ordem: 3, enunciado: 'Atende por qual apelido?', respostaEsperada: 'Bicho' },
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.pessoa.createMany({ data: pessoas })
      await tx.$executeRawUnsafe(`
        INSERT INTO local (id, ponto, bairro, referencia, raio_imprecisao_m)
        VALUES ${locaisSql.join(',\n')}
      `)
      await tx.animal.createMany({ data: animais })
      await tx.caso.createMany({ data: casos })
      await tx.perguntaVerificacao.createMany({ data: perguntas })
    })

    if ((fim % 5000 === 0) || fim === TOTAL_CASOS) {
      console.log(`... inseridos ${fim}/${TOTAL_CASOS} casos`)
    }
  }

  const total = await prisma.caso.count()
  console.log(`Total de casos no banco ${NOME_BANCO}: ${total}`)
  console.log(`Casos dentro do raio de 1600 m: ${casosNoRaio1600} de ${TOTAL_CASOS} (${((casosNoRaio1600 / TOTAL_CASOS) * 100).toFixed(2)}%)`)

  await prisma.$disconnect()
}

async function main() {
  await prepararBanco()
  await semearCasos()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
