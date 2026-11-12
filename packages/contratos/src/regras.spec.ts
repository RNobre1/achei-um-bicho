import { describe, expect, it } from 'vitest'
import type { NovaPublicacao } from './api'
import {
  CODIGO_EDICAO,
  FOTO,
  gerarCodigoEdicao,
  LIMITES_DE_TEXTO,
  PAREAMENTO,
  pareceContato,
  RAIO,
  REIVINDICACAO,
  TAREFA_DIARIA,
  TELEFONE,
} from './regras'

describe('regras do raio do mural', () => {
  it('parte de 1,6 km, a distância em que 7 de cada 10 cães recuperados apareceram', () => {
    expect(RAIO.padraoM).toBe(1600)
  })

  it('mantém o padrão entre o mínimo e o máximo', () => {
    expect(RAIO.minimoM).toBeLessThan(RAIO.padraoM)
    expect(RAIO.padraoM).toBeLessThan(RAIO.maximoM)
  })

  it('oferece ao usuário degraus crescentes dentro dos limites, começando pelo padrão', () => {
    expect(RAIO.degrausM[0]).toBe(RAIO.padraoM)
    expect(RAIO.degrausM.at(-1)).toBe(RAIO.maximoM)
    expect([...RAIO.degrausM].sort((a, b) => a - b)).toEqual(RAIO.degrausM)
  })
})

describe('regras da foto do animal', () => {
  it('cabe no limite de dados da publicação, que é de 1 MB no total', () => {
    expect(FOTO.maximoBytes).toBeLessThanOrEqual(1_000_000)
  })

  it('é reduzida no aparelho a uma largura que ainda mostra os sinais do bicho', () => {
    expect(FOTO.larguraMaximaPx).toBeGreaterThanOrEqual(720)
    expect(FOTO.larguraMaximaPx).toBeLessThanOrEqual(1280)
  })

  it('tem um limite de fotos por caso', () => {
    expect(FOTO.maximoPorCaso).toBe(3)
  })
})

describe('regras do pareamento', () => {
  it('só procura candidato até o raio máximo do mural, a regra RN7', () => {
    expect(PAREAMENTO.raioMaximoM).toBe(RAIO.maximoM)
  })

  it('conta a distância como coincidência dentro do raio padrão, onde aparecem 7 de 10 cães', () => {
    expect(PAREAMENTO.distanciaQueBateM).toBe(RAIO.padraoM)
  })

  it('aceita achado um pouco antes do sumiço declarado, porque memória e relógio erram', () => {
    expect(PAREAMENTO.diasAntesQueAindaBatem).toBeGreaterThanOrEqual(0)
    expect(PAREAMENTO.diasAntesQueAindaBatem).toBeLessThan(PAREAMENTO.diasDepoisQueBatem)
  })
})

describe('regras da reivindicação e da tarefa diária', () => {
  it('teto de reivindicações pendentes por caso é cinco', () => {
    expect(REIVINDICACAO.maximoPendentesPorCaso).toBe(5)
  })

  it('cron da tarefa diária bate com 08:00 em Santarém (UTC-3)', () => {
    // 08:00 local sem horário de verão = 11:00 UTC
    expect(TAREFA_DIARIA.cronUtc).toBe('0 11 * * *')
    expect(TAREFA_DIARIA.fuso).toBe('America/Santarem')
  })
})

describe('regras de telefone', () => {
  it('valida telefone com 10 ou 11 dígitos e possui mensagem padronizada', () => {
    expect(TELEFONE.expressao.test('93991234567')).toBe(true)
    expect(TELEFONE.expressao.test('9335221234')).toBe(true)
    expect(TELEFONE.expressao.test('123')).toBe(false)
    expect(TELEFONE.expressao.test('9399123456789')).toBe(false)
    expect(TELEFONE.mensagem).toBe('Telefone com DDD: 10 ou 11 dígitos')
  })

  it('normaliza retirando qualquer caractere não numérico', () => {
    expect(TELEFONE.normalizar('(93) 99123-4567')).toBe('93991234567')
    expect(TELEFONE.normalizar(' 93 3522-1234 ')).toBe('9335221234')
  })

  it('extrai a chave do telefone com DDD e os 8 últimos dígitos para casar número com e sem 9', () => {
    const comNove = '93991234567'
    const semNove = '9391234567'
    expect(TELEFONE.chave(comNove)).toBe('9391234567')
    expect(TELEFONE.chave(semNove)).toBe('9391234567')
    expect(TELEFONE.chave('(93) 99123-4567')).toBe(TELEFONE.chave('93 9123-4567'))
  })
})

describe('regras do código de edição', () => {
  it("casa todo caractere do alfabeto e recusa qualquer caractere fora", () => {
    for (const char of CODIGO_EDICAO.alfabeto) {
      const codigo = `${char.repeat(4)}-${char.repeat(4)}`
      expect(CODIGO_EDICAO.padrao.test(codigo)).toBe(true)
    }
    const fora = ["0", "1", "O", "I", "L", "a", "b", "!", "@", " "]
    for (const char of fora) {
      const codigo = `${char.repeat(4)}-2345`
      expect(CODIGO_EDICAO.padrao.test(codigo)).toBe(false)
    }
  })

  it("expõe o formato e deriva o regex de alfabeto, tamanho e quantidade de blocos", () => {
    expect(CODIGO_EDICAO.formato).toBe("XXXX-XXXX")
    expect(CODIGO_EDICAO.quantidadeBlocos).toBe(2)
  })

  it("gerarCodigoEdicao usa a função de sorteio passada", () => {
    const codigo = gerarCodigoEdicao((max) => 0)
    expect(codigo).toBe("2222-2222")
    expect(CODIGO_EDICAO.padrao.test(codigo)).toBe(true)
  })

  it('define o alfabeto sem caracteres ambíguos e tamanho do bloco', () => {
    expect(CODIGO_EDICAO.alfabeto).toBe('23456789ABCDEFGHJKMNPQRSTUVWXYZ')
    expect(CODIGO_EDICAO.tamanhoBloco).toBe(4)
    expect(CODIGO_EDICAO.alfabeto).not.toMatch(/[0O1IL]/)
  })

  it('valida o formato XXXX-XXXX pela expressão regular', () => {
    const regex = CODIGO_EDICAO.expressaoRegular ?? CODIGO_EDICAO.padrao
    expect(regex.test('2345-6789')).toBe(true)
    expect(regex.test('ABCD-EFGH')).toBe(true)
    expect(regex.test('0123-4567')).toBe(false)
    expect(regex.test('ABCD-EFG')).toBe(false)
    expect(regex.test('abcd-efgh')).toBe(false)
  })
})

describe('limites de texto em fonte única', () => {
  it('define limites para todos os campos textuais do sistema', () => {
    expect(LIMITES_DE_TEXTO).toEqual({
      nomeAnimal: 60,
      bairro: 80,
      referencia: 160,
      nomePessoa: 80,
      telefone: 20,
      enunciado: 160,
      resposta: 160,
      respostaReivindicacao: 500,
      relato: 600,
      observacao: 500,
      textoDenuncia: 500,
    })
  })
})

describe('pareceContato (RNF4)', () => {
  it('bloqueia telefones em vários formatos, zap, wa.me e links', () => {
    expect(pareceContato('Ligue 93 99123-4567')).toBe(true)
    expect(pareceContato('Meu número é 99123-4567')).toBe(true)
    expect(pareceContato('Fixo 3522-1234')).toBe(true)
    expect(pareceContato('+55 93 99123-4567')).toBe(true)
    expect(pareceContato('Chama no zap')).toBe(true)
    expect(pareceContato('Mande um whats')).toBe(true)
    expect(pareceContato('wa.me/5593991234567')).toBe(true)
    expect(pareceContato('Veja em https://exemplo.com')).toBe(true)
    expect(pareceContato('Acesse www.exemplo.com')).toBe(true)
  })

  it('não bloqueia datas com hífen ou ponto, CEP, microchip de 15 dígitos ou texto legítimo', () => {
    expect(pareceContato('Visto em 12-11-2026 na praça')).toBe(false)
    expect(pareceContato('Data do sumiço: 2026-11-12')).toBe(false)
    expect(pareceContato('Aconteceu em 12.11.2026')).toBe(false)
    expect(pareceContato('Perto do CEP 68005-000')).toBe(false)
    expect(pareceContato('Microchip 985112345678901')).toBe(false)
    expect(pareceContato('Cão dócil, porte médio, coleira vermelha')).toBe(false)
  })
})

describe('RNF2 · tamanho máximo da publicação', () => {
  it('monta a maior publicação permitida usando LIMITES_DE_TEXTO e prova que com uma foto cabe em 1 MB', () => {
    const maiorPublicacao: NovaPublicacao = {
      tipo: 'perdido',
      animal: {
        especie: 'cachorro',
        porte: 'grande',
        corDominante: 'caramelo',
        coleira: 'com',
        nome: 'A'.repeat(LIMITES_DE_TEXTO.nomeAnimal),
        castrado: true,
      },
      local: {
        latitude: -2.44321,
        longitude: -54.71234,
        bairro: 'B'.repeat(LIMITES_DE_TEXTO.bairro),
        referencia: 'R'.repeat(LIMITES_DE_TEXTO.referencia),
      },
      autor: {
        nome: 'N'.repeat(LIMITES_DE_TEXTO.nomePessoa),
        telefone: '9'.repeat(LIMITES_DE_TEXTO.telefone),
      },
      ocorridoEm: '2026-11-12T12:00:00.000Z',
      relato: 'X'.repeat(LIMITES_DE_TEXTO.relato),
      perguntas: [
        {
          enunciado: 'P1'.padEnd(LIMITES_DE_TEXTO.enunciado, '?'),
          respostaEsperada: 'R1'.padEnd(LIMITES_DE_TEXTO.resposta, '.'),
        },
        {
          enunciado: 'P2'.padEnd(LIMITES_DE_TEXTO.enunciado, '?'),
          respostaEsperada: 'R2'.padEnd(LIMITES_DE_TEXTO.resposta, '.'),
        },
        {
          enunciado: 'P3'.padEnd(LIMITES_DE_TEXTO.enunciado, '?'),
          respostaEsperada: 'R3'.padEnd(LIMITES_DE_TEXTO.resposta, '.'),
        },
      ],
      idCliente: '123e4567-e89b-12d3-a456-426614174000',
      codigoEdicao: 'ABCD-EFGH',
    }

    const jsonBytes = Buffer.byteLength(JSON.stringify(maiorPublicacao), 'utf8')
    const totalBytes = jsonBytes + FOTO.maximoBytes
    const UM_MEGABYTE = 1_000_000

    expect(totalBytes).toBeLessThanOrEqual(UM_MEGABYTE)
  })
})
