import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FOTO, type NovaPublicacao } from '@achei/contratos'
import { describe, expect, it } from 'vitest'
import { compararCasos, ordemDasPistas } from '../src/pareamento/comparar'
import { casosDeDemonstracao, PASTA_DAS_FOTOS, type Ponto } from './casos-de-demonstracao'

// O roteiro do alpha (docs/alpha/roteiro.md): da sala, no campus, alguém publica um
// cachorro caramelo de porte médio, com coleira, que sumiu "ontem à tarde" (o app
// grava 16h da véspera). As três pistas precisam sair como o roteiro promete, quer o
// banco tenha sido semeado na véspera, quer na manhã da apresentação.
const CAMPUS: Ponto = { latitude: -2.4191, longitude: -54.7408 }
const SUMICO_AO_VIVO = new Date('2026-10-15T16:00:00-03:00')
const SEMEADO_EM = {
  'na tarde da véspera': new Date('2026-10-15T14:00:00-03:00'),
  'na noite da véspera': new Date('2026-10-15T21:00:00-03:00'),
  'na manhã da apresentação': new Date('2026-10-16T07:00:00-03:00'),
}

const RAIO_DA_TERRA_M = 6_371_000
function distanciaM(a: Ponto, b: Ponto): number {
  const rad = (graus: number) => (graus * Math.PI) / 180
  const h =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2
  return 2 * RAIO_DA_TERRA_M * Math.asin(Math.sqrt(h))
}

function pistasDoCasoAoVivo(casos: NovaPublicacao[]) {
  const perdido = { porte: 'medio', corDominante: 'caramelo', coleira: 'com', ocorridoEm: SUMICO_AO_VIVO } as const
  return casos
    .filter((caso) => caso.tipo === 'encontrado' && caso.animal.especie === 'cachorro')
    .map((caso) => {
      const distancia = distanciaM(CAMPUS, caso.local)
      const encontrado = { ...caso.animal, ocorridoEm: new Date(caso.ocorridoEm) }
      const { batem, divergem } = compararCasos(perdido, encontrado, distancia)
      return {
        bairro: caso.local.bairro,
        distanciaM: distancia,
        batem: batem.map((c) => c.atributo),
        divergem: divergem.map((c) => c.atributo),
      }
    })
    .sort(ordemDasPistas)
}

describe('casos de demonstração do alpha', () => {
  describe.each(Object.entries(SEMEADO_EM))('semeados %s', (_, agora) => {
    const pistas = pistasDoCasoAoVivo(casosDeDemonstracao(CAMPUS, agora).map((caso) => caso.publicacao))

    it('dão três pistas ao cachorro publicado ao vivo, na ordem do roteiro', () => {
      expect(pistas.map((p) => p.bairro)).toEqual(['Aeroporto Velho', 'Salé', 'Liberdade'])
    })

    it('a primeira bate em tudo', () => {
      expect(pistas[0]!.divergem).toEqual([])
    })

    it('a segunda é mais perto, mas a coleira não confere', () => {
      expect(pistas[1]!.distanciaM).toBeLessThan(pistas[0]!.distanciaM)
      expect(pistas[1]!.divergem).toEqual(['coleira'])
    })

    it('a terceira tem só a cor e a distância contra', () => {
      expect(pistas[2]!.divergem).toEqual(['cor', 'distancia'])
    })
  })

  // mural e pistas sem foto parecem protótipo; cada caso leva uma foto livre de direitos
  it.each(casosDeDemonstracao(CAMPUS, new Date()).map((caso) => caso.foto))('a foto %s existe, é JPEG e cabe no limite da API', (foto) => {
    const conteudo = readFileSync(join(PASTA_DAS_FOTOS, foto))
    expect([...conteudo.subarray(0, 2)]).toEqual([0xff, 0xd8])
    expect(conteudo.length).toBeLessThanOrEqual(FOTO.maximoBytes)
  })
})
