import { ESTADO_CASO, ESTADO_INICIAL, TIPO_CASO, TRANSICOES_DO_CASO, type EstadoCaso, type TipoCaso } from '@achei/contratos'

/**
 * Diagrama de estados do caso, gerado do vocabulário e das transições declaradas
 * em contratos. O teste de frescor reprova se o .drawio ficar para trás.
 */

/** Caminho do arquivo, relativo à raiz do repositório. */
export const ARQUIVO_ESTADOS = 'docs/uml/estados.drawio'

const TINTA = '#123E4A'
const FUNDO = '#EEF2EE'
const LARGURA = 200
const ALTURA = 60

// Onde cada estado fica no desenho: a única parte que não dá para derivar.
export const POSICOES_ESTADOS: Record<EstadoCaso, { x: number; y: number }> = {
  procurando: { x: 140, y: 80 },
  abrigado_temporariamente: { x: 140, y: 320 },
  em_contato: { x: 480, y: 200 },
  resolvido: { x: 820, y: 200 },
  expirado: { x: 480, y: 460 },
}

const INICIO = { x: 40, y: 218 }
const FIM = { x: 1100, y: 326 }

// desvios para as setas longas não atravessarem outra caixa
const DESVIOS: Partial<Record<`${EstadoCaso}>${EstadoCaso}`, { pontos: [number, number][]; estilo?: string }>> = {
  'procurando>resolvido': { pontos: [[920, 110]], estilo: 'exitX=1;exitY=0.5;entryX=0.5;entryY=0;' },
  'abrigado_temporariamente>resolvido': { pontos: [[920, 350]], estilo: 'exitX=1;exitY=0.5;entryX=0.5;entryY=1;' },
  'procurando>expirado': { pontos: [[16, 110], [16, 505]], estilo: 'exitX=0;exitY=0.5;entryX=0;entryY=0.75;' },
}

const escapar = (texto: string) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function seta(id: string, origem: string, destino: string, rotulo: string, extra = '', pontos: [number, number][] = []): string {
  const geometria = pontos.length
    ? `<mxGeometry relative="1" as="geometry"><Array as="points">${pontos.map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join('')}</Array></mxGeometry>`
    : '<mxGeometry relative="1" as="geometry"/>'
  return (
    `<mxCell id="${id}" value="${escapar(rotulo)}" style="endArrow=open;endSize=10;html=1;rounded=0;strokeColor=${TINTA};` +
    `fontColor=${TINTA};fontSize=11;labelBackgroundColor=#FFFFFF;${extra}" edge="1" parent="1" source="${origem}" target="${destino}">` +
    `${geometria}</mxCell>`
  )
}

export function gerarDiagramaEstados(): string {
  const celulas: string[] = [
    `<mxCell id="inicio" value="" style="ellipse;fillColor=${TINTA};strokeColor=${TINTA};" vertex="1" parent="1">` +
      `<mxGeometry x="${INICIO.x}" y="${INICIO.y}" width="24" height="24" as="geometry"/></mxCell>`,
    `<mxCell id="fim" value="" style="ellipse;shape=doubleEllipse;fillColor=${TINTA};strokeColor=${TINTA};" vertex="1" parent="1">` +
      `<mxGeometry x="${FIM.x}" y="${FIM.y}" width="28" height="28" as="geometry"/></mxCell>`,
  ]

  for (const estado of ESTADO_CASO.valores) {
    const { x, y } = POSICOES_ESTADOS[estado]
    const rotulo = `<b>${ESTADO_CASO.entradas[estado].rotulo}</b><br><span style="font-size:10px">${estado}</span>`
    celulas.push(
      `<mxCell id="estado-${estado}" value="${escapar(rotulo)}" style="rounded=1;arcSize=30;whiteSpace=wrap;html=1;` +
        `fillColor=${FUNDO};strokeColor=${TINTA};fontColor=${TINTA};fontSize=13;" vertex="1" parent="1">` +
        `<mxGeometry x="${x}" y="${y}" width="${LARGURA}" height="${ALTURA}" as="geometry"/></mxCell>`,
    )
  }

  for (const [tipo, estado] of Object.entries(ESTADO_INICIAL) as [TipoCaso, EstadoCaso][]) {
    celulas.push(seta(`inicio-${estado}`, 'inicio', `estado-${estado}`, `caso "${TIPO_CASO.entradas[tipo].rotulo}" publicado`))
  }

  TRANSICOES_DO_CASO.forEach((t, i) => {
    const desvio = DESVIOS[`${t.de}>${t.para}`]
    celulas.push(seta(`transicao-${i}`, `estado-${t.de}`, `estado-${t.para}`, t.quando, desvio?.estilo, desvio?.pontos))
  })

  const finais = ESTADO_CASO.valores.filter((estado) => !TRANSICOES_DO_CASO.some((t) => t.de === estado))
  for (const estado of finais) celulas.push(seta(`fim-${estado}`, `estado-${estado}`, 'fim', ''))

  celulas.push(
    `<mxCell id="nota" value="${escapar('Caso aberto há 9 dias sem interação recebe pedido de confirmação; sem resposta, aos 15 dias expira e sai do mural.')}" ` +
      `style="shape=note;whiteSpace=wrap;html=1;size=14;align=left;spacingLeft=8;fillColor=#FFFFFF;strokeColor=${TINTA};fontColor=${TINTA};fontSize=11;" ` +
      `vertex="1" parent="1"><mxGeometry x="830" y="540" width="260" height="70" as="geometry"/></mxCell>`,
  )

  return `<mxfile host="app.diagrams.net" type="device">
  <diagram id="estados" name="Estados do caso">
    <mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1"
                  arrows="1" fold="1" page="1" pageScale="1" pageWidth="1200" pageHeight="640"
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
