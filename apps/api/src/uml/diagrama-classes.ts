import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { VOCABULARIO, type NomeConjunto } from '@achei/contratos'
import { Prisma } from '@prisma/client'
import { COLUNAS_COM_VOCABULARIO } from '../vocabulario/vocabulario-no-banco'

/**
 * Diagrama de classes do domínio, gerado do schema do Prisma e do manifesto do
 * vocabulário. Desenhar à mão seria manter uma terceira cópia do modelo, que
 * envelhece calada; gerado, o teste de frescor acusa quando o código muda.
 */

/** Caminho do arquivo, relativo à raiz do repositório. */
export const ARQUIVO_DIAGRAMA = 'docs/uml/classes.drawio'

export interface Classe {
  nome: string
  atributos: string[]
}

export interface Enumeracao {
  nome: string
  valores: string[]
}

export interface Associacao {
  /** Classe que guarda a chave estrangeira. */
  origem: string
  destino: string
  multOrigem: string
  multDestino: string
  /** Nome do lado de destino, como aparece no modelo. */
  papel: string
}

export interface ModeloDeClasses {
  classes: Classe[]
  enumeracoes: Enumeracao[]
  associacoes: Associacao[]
}

// Onde cada classe fica no desenho. Classe nova sem lugar aqui reprova o teste: o
// layout das classes é a única parte do diagrama que não dá para derivar. As
// enumerações se empilham sozinhas à direita.
export const POSICOES: Record<string, { x: number; y: number }> = {
  Foto: { x: 40, y: 40 },
  Animal: { x: 380, y: 40 },
  Pessoa: { x: 720, y: 40 },
  TentativaVerificacao: { x: 1060, y: 40 },
  Pareamento: { x: 40, y: 300 },
  Caso: { x: 380, y: 300 },
  Avistamento: { x: 720, y: 380 },
  RespostaVerificacao: { x: 1060, y: 330 },
  Desfecho: { x: 40, y: 640 },
  Local: { x: 380, y: 640 },
  PerguntaVerificacao: { x: 1060, y: 600 },
}

const X_ENUMERACOES = [1420, 1660]
const ESPACO_ENTRE_CAIXAS = 20

const TINTA = '#123E4A'
const FUNDO_CLASSE = '#EEF2EE'
const FUNDO_ENUM = '#F6F1E4'
const LARGURA_CLASSE = 240
const LARGURA_ENUM = 200
const ALTURA_LINHA = 18
const TOPO_CLASSE = 26
const TOPO_ENUM = 40

const alturaDaCaixa = (topo: number, linhas: number) => topo + linhas * ALTURA_LINHA + 8

/** Enumerações em duas colunas, uma embaixo da outra, metade em cada. */
export function posicoesDasEnumeracoes(enumeracoes: Enumeracao[]): Record<string, { x: number; y: number }> {
  const porColuna = Math.ceil(enumeracoes.length / X_ENUMERACOES.length)
  const posicoes: Record<string, { x: number; y: number }> = {}
  X_ENUMERACOES.forEach((x, coluna) => {
    let y = 40
    for (const enumeracao of enumeracoes.slice(coluna * porColuna, (coluna + 1) * porColuna)) {
      posicoes[enumeracao.nome] = { x, y }
      y += alturaDaCaixa(TOPO_ENUM, enumeracao.valores.length) + ESPACO_ENTRE_CAIXAS
    }
  })
  return posicoes
}

const nomeDaEnumeracao = (conjunto: NomeConjunto) => conjunto[0]!.toUpperCase() + conjunto.slice(1)
const snake = (nome: string) => nome.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`)

interface CampoNaoSuportado {
  campo: string
  tipo: string
  /** Campo que vem antes no schema, para manter a ordem na caixa. */
  depoisDe: string
}

/** Campos que o Prisma não enxerga (geography do PostGIS), lidos direto do schema. */
function camposNaoSuportados(): Map<string, CampoNaoSuportado[]> {
  const schema = readFileSync(resolve(__dirname, '../../prisma/schema.prisma'), 'utf-8')
  const resultado = new Map<string, CampoNaoSuportado[]>()
  for (const [, modelo, corpo] of schema.matchAll(/^model (\w+) \{([^}]*)\}/gm)) {
    const linhas = [...corpo!.matchAll(/^\s+(\w+)\s+(.+)$/gm)].map(([, campo, resto]) => ({ campo: campo!, resto: resto! }))
    linhas.forEach(({ campo, resto }, i) => {
      const tipo = /^Unsupported\("([^"]+)"\)/.exec(resto)?.[1]
      if (!tipo) return
      const lista = resultado.get(modelo!) ?? []
      lista.push({ campo, tipo, depoisDe: linhas[i - 1]?.campo ?? '' })
      resultado.set(modelo!, lista)
    })
  }
  return resultado
}

export function modeloDeClasses(): ModeloDeClasses {
  const modelos = Prisma.dmmf.datamodel.models
  const naoSuportados = camposNaoSuportados()

  const classes = modelos.map((modelo): Classe => {
    const chavesEstrangeiras = new Set(modelo.fields.flatMap((f) => f.relationFromFields ?? []))
    const atributos: { campo: string; texto: string }[] = []
    for (const campo of modelo.fields) {
      if (campo.kind === 'object' || chavesEstrangeiras.has(campo.name)) continue
      const coluna = campo.dbName ?? snake(campo.name)
      const vocabulario = COLUNAS_COM_VOCABULARIO.find((c) => c.tabela === modelo.dbName && c.coluna === coluna)
      const tipo = vocabulario ? nomeDaEnumeracao(vocabulario.conjunto) : campo.type
      atributos.push({ campo: campo.name, texto: `${campo.name}: ${tipo}${campo.isRequired ? '' : ' [0..1]'}` })
    }
    for (const extra of naoSuportados.get(modelo.name) ?? []) {
      const posicao = atributos.findIndex((a) => a.campo === extra.depoisDe) + 1
      atributos.splice(posicao, 0, { campo: extra.campo, texto: `${extra.campo}: ${extra.tipo}` })
    }
    return { nome: modelo.name, atributos: atributos.map((a) => a.texto) }
  })

  const associacoes = modelos.flatMap((modelo) =>
    modelo.fields
      .filter((campo) => campo.kind === 'object' && (campo.relationFromFields?.length ?? 0) > 0)
      .map((campo): Associacao => {
        const volta = modelos
          .find((m) => m.name === campo.type)!
          .fields.find((f) => f.relationName === campo.relationName && f !== campo)!
        return {
          origem: modelo.name,
          destino: campo.type,
          multOrigem: volta.isList ? '0..*' : '0..1',
          multDestino: campo.isRequired ? '1' : '0..1',
          papel: campo.name,
        }
      }),
  )

  const enumeracoes = (Object.keys(VOCABULARIO) as NomeConjunto[]).map((conjunto) => ({
    nome: nomeDaEnumeracao(conjunto),
    valores: [...VOCABULARIO[conjunto].valores],
  }))

  return { classes, enumeracoes, associacoes }
}

const escapar = (texto: string) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

interface EstiloDaCaixa {
  x: number
  y: number
  largura: number
  topo: number
  fundo: string
  negrito: boolean
}

function caixa(id: string, titulo: string, linhas: string[], estilo: EstiloDaCaixa): string[] {
  const { x, y } = estilo
  const altura = alturaDaCaixa(estilo.topo, linhas.length)
  const celulas = [
    `<mxCell id="${id}" value="${escapar(titulo)}" style="swimlane;fontStyle=${estilo.negrito ? 1 : 0};align=center;verticalAlign=top;` +
      `childLayout=stackLayout;horizontal=1;startSize=${estilo.topo};horizontalStack=0;resizeParent=1;resizeParentMax=0;` +
      `resizeLast=0;collapsible=0;marginBottom=0;html=1;fillColor=${estilo.fundo};strokeColor=${TINTA};fontColor=${TINTA};fontSize=13;" ` +
      `vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${estilo.largura}" height="${altura}" as="geometry"/></mxCell>`,
  ]
  linhas.forEach((linha, i) => {
    celulas.push(
      `<mxCell id="${id}-${i}" value="${escapar(linha)}" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;` +
        `spacingLeft=8;spacingRight=4;overflow=hidden;rotatable=0;html=1;fontColor=${TINTA};fontSize=11;" vertex="1" parent="${id}">` +
        `<mxGeometry y="${estilo.topo + i * ALTURA_LINHA}" width="${estilo.largura}" height="${ALTURA_LINHA}" as="geometry"/></mxCell>`,
    )
  })
  return celulas
}

// a multiplicidade da origem vai embaixo da linha e a do destino em cima: em
// associação curta as duas não se atropelam
function rotulo(id: string, pai: string, valor: string, x: number, ponta: 'origem' | 'destino'): string {
  const alinhamento = ponta === 'origem' ? 'align=left;verticalAlign=top' : 'align=right;verticalAlign=bottom'
  return (
    `<mxCell id="${id}" value="${escapar(valor)}" style="edgeLabel;resizable=0;html=1;${alinhamento};` +
    `fontColor=${TINTA};fontSize=11;labelBackgroundColor=#FFFFFF;" vertex="1" connectable="0" parent="${pai}">` +
    `<mxGeometry x="${x}" relative="1" as="geometry"><mxPoint as="offset"/></mxGeometry></mxCell>`
  )
}

export function gerarDiagramaClasses(): string {
  const { classes, enumeracoes, associacoes } = modeloDeClasses()
  const celulas: string[] = []

  const doEnum = posicoesDasEnumeracoes(enumeracoes)

  for (const classe of classes) {
    celulas.push(
      ...caixa(classe.nome, classe.nome, classe.atributos, {
        ...(POSICOES[classe.nome] ?? { x: 0, y: 0 }),
        largura: LARGURA_CLASSE,
        topo: TOPO_CLASSE,
        fundo: FUNDO_CLASSE,
        negrito: true,
      }),
    )
  }
  for (const enumeracao of enumeracoes) {
    celulas.push(
      ...caixa(enumeracao.nome, `«enumeration»<br><b>${enumeracao.nome}</b>`, enumeracao.valores, {
        ...doEnum[enumeracao.nome]!,
        largura: LARGURA_ENUM,
        topo: TOPO_ENUM,
        fundo: FUNDO_ENUM,
        negrito: false,
      }),
    )
  }

  associacoes.forEach((a, i) => {
    // duas associações entre o mesmo par (os lados do pareamento) saem em alturas diferentes
    const paralelas = associacoes.filter((b) => b.origem === a.origem && b.destino === a.destino)
    let pontas = ''
    if (paralelas.length > 1) {
      const altura = (paralelas.indexOf(a) + 1) / (paralelas.length + 1)
      const paraDireita = (POSICOES[a.origem]?.x ?? 0) < (POSICOES[a.destino]?.x ?? 0)
      pontas = `exitX=${paraDireita ? 1 : 0};exitY=${altura};entryX=${paraDireita ? 0 : 1};entryY=${altura};`
    }
    const id = `assoc-${i}`
    celulas.push(
      `<mxCell id="${id}" value="" style="endArrow=none;html=1;rounded=0;strokeColor=${TINTA};${pontas}" edge="1" parent="1" ` +
        `source="${a.origem}" target="${a.destino}"><mxGeometry relative="1" as="geometry"/></mxCell>`,
      rotulo(`${id}-origem`, id, a.multOrigem, -0.8, 'origem'),
      rotulo(`${id}-destino`, id, `${a.papel} ${a.multDestino}`, 0.8, 'destino'),
    )
  })

  return `<mxfile host="app.diagrams.net" type="device">
  <diagram id="classes" name="Diagrama de classes">
    <mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1"
                  arrows="1" fold="1" page="1" pageScale="1" pageWidth="1900" pageHeight="900"
                  math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${celulas.join('\n        ')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`
}
