import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const BASE_URL = process.env.DATABASE_URL_BASE ?? 'postgresql://bicho:bicho@localhost:5432'
const NOME_BANCO = 'achei_carga_d'
const URL_ADMIN = `${BASE_URL}/achei_um_bicho`
const URL_BANCO = `${BASE_URL}/${NOME_BANCO}`

// Praça da Matriz em Santarém
const CENTRO = { latitude: -2.4432, longitude: -54.7123 }
const TOTAL_CASOS = 200

const ESPECIES = ['cachorro', 'gato'] as const
const PORTES = ['pequeno', 'medio', 'grande'] as const
const CORES = ['caramelo', 'preto', 'branco', 'malhado', 'cinza'] as const
const COLEIRAS = ['com', 'sem', 'nao_observado'] as const
const NOMES = ['Caramelo', 'Pipoca', 'Thor', 'Mel', 'Bob', 'Luna', 'Simba', 'Bidu', 'Nina', 'Totó']
const BAIRROS = ['Centro', 'Santa Clara', 'Aldeia', 'Aparecida', 'Prainha', 'Caranazal', 'Santíssimo', 'Salé']

function pontoEmVolta(centro: { latitude: number; longitude: number }, raioMaximoM: number) {
  // Conversão aproximada para Santarém (~111 km por grau)
  const angulo = Math.random() * 2 * Math.PI
  const distancia = Math.sqrt(Math.random()) * raioMaximoM
  const deltaLat = (distancia * Math.cos(angulo)) / 111_000
  const deltaLon = (distancia * Math.sin(angulo)) / (111_000 * Math.cos((centro.latitude * Math.PI) / 180))
  return {
    latitude: Number((centro.latitude + deltaLat).toFixed(6)),
    longitude: Number((centro.longitude + deltaLon).toFixed(6)),
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

  console.log(`Semeando ${TOTAL_CASOS} casos em ${NOME_BANCO}...`)

  for (let i = 0; i < TOTAL_CASOS; i++) {
    const pt = pontoEmVolta(CENTRO, 4500)
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

    await prisma.pessoa.create({
      data: {
        id: autorId,
        nome: `Autor ${i + 1}`,
        telefone: '93991234567',
      },
    })

    const wkt = `SRID=4326;POINT(${pt.longitude} ${pt.latitude})`
    await prisma.$executeRaw`
      INSERT INTO local (id, ponto, bairro, referencia, raio_imprecisao_m)
      VALUES (${localId}::uuid, ST_GeogFromText(${wkt}), ${bairro}, 'Perto da praça', 300)
    `

    await prisma.animal.create({
      data: {
        id: animalId,
        especie,
        porte,
        corDominante: cor,
        coleira,
        nome,
        castrado: i % 4 === 0,
      },
    })

    await prisma.caso.create({
      data: {
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
        perguntas: {
          create: [
            { ordem: 1, enunciado: 'Qual a cor da coleira?', respostaEsperada: 'Vermelha' },
            { ordem: 2, enunciado: 'Tem alguma mancha?', respostaEsperada: 'No rabo' },
            { ordem: 3, enunciado: 'Atende por qual apelido?', respostaEsperada: 'Bicho' },
          ],
        },
      },
    })
  }

  const total = await prisma.caso.count()
  console.log(`Total de casos no banco ${NOME_BANCO}: ${total}`)
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
