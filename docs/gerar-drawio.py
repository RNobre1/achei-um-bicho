#!/usr/bin/env python3
"""Gera o modelo ER em formato .drawio, importável e editável no draw.io.

As entidades e ligações vêm de gerar-er.py — fonte única. Mudar o modelo lá
atualiza o SVG e este arquivo juntos; editar só um dos dois é como a divergência
começa.

    python3 docs/gerar-drawio.py

Saída: docs/modelo-er.drawio
Abrir em app.diagrams.net → Arquivo → Abrir de → Dispositivo.
"""

import importlib.util
from pathlib import Path
from xml.sax.saxutils import escape

# o arquivo tem hífen no nome, então o import normal não alcança
_spec = importlib.util.spec_from_file_location(
    "gerar_er", Path(__file__).resolve().parent / "gerar-er.py"
)
_modelo = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_modelo)
ENTIDADES, LIGACOES = _modelo.ENTIDADES, _modelo.LIGACOES

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "docs" / "modelo-er.drawio"

LARG = 300
ALT_LINHA = 30
ALT_CABECA = 34
LARG_MARCA = 46

TAPAJOS = "#123E4A"
PERDI = "#2F8587"
SILTE = "#8C7F66"
CHUVA = "#EEF2EE"

DESTAQUE = {"caso"}
SENSIVEL = {"pergunta_verificacao"}

# notação pé de galinha (crow's foot), que é o padrão do draw.io para ER
SETAS = {
    "1:1": ("ERmandOne", "ERmandOne"),
    "1:N": ("ERmandOne", "ERmany"),
    "1:3": ("ERmandOne", "ERmany"),
    "1:0..1": ("ERmandOne", "ERzeroToOne"),
}

# o SVG usa escala menor; o draw.io respira melhor com mais espaço
ESCALA_X = 1.35
ESCALA_Y = 1.15


def estilo_tabela(nome):
    if nome in DESTAQUE:
        cabeca, borda = TAPAJOS, TAPAJOS
    elif nome in SENSIVEL:
        cabeca, borda = SILTE, SILTE
    else:
        cabeca, borda = PERDI, PERDI
    return (
        "shape=table;startSize=34;container=1;collapsible=1;childLayout=tableLayout;"
        "fixedRows=1;rowLines=1;columnLines=1;fontStyle=1;align=center;resizeLast=1;"
        f"html=1;fontSize=14;fontColor={CHUVA};fillColor={cabeca};"
        f"strokeColor={borda};strokeWidth=1.5;"
    )


ESTILO_LINHA = (
    "shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;"
    "fillColor=#FFFFFF;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];"
    "portConstraint=eastwest;top=0;left=0;right=0;bottom=0;strokeColor=#DDE3DD;html=1;"
)
ESTILO_MARCA = (
    "shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=0;right=0;"
    "align=center;fontSize=10;fontColor=#5F7076;overflow=hidden;html=1;"
)
ESTILO_CAMPO = (
    "shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=0;right=0;"
    "align=left;spacingLeft=8;fontSize=12;fontColor=#123E4A;overflow=hidden;html=1;"
)


def gerar():
    celulas = []
    # id da célula da linha "id" de cada tabela, para ancorar as arestas
    ancora = {}

    for nome, (x, y, atributos) in ENTIDADES.items():
        altura = ALT_CABECA + len(atributos) * ALT_LINHA
        tid = f"tab_{nome}"
        celulas.append(
            f'<mxCell id="{tid}" value="{escape(nome)}" style="{estilo_tabela(nome)}" '
            f'vertex="1" parent="1">'
            f'<mxGeometry x="{x * ESCALA_X:.0f}" y="{y * ESCALA_Y:.0f}" '
            f'width="{LARG}" height="{altura}" as="geometry"/></mxCell>'
        )

        for i, (atributo, marca) in enumerate(atributos):
            rid = f"{tid}_l{i}"
            celulas.append(
                f'<mxCell id="{rid}" value="" style="{ESTILO_LINHA}" vertex="1" parent="{tid}">'
                f'<mxGeometry y="{ALT_CABECA + i * ALT_LINHA}" width="{LARG}" '
                f'height="{ALT_LINHA}" as="geometry"/></mxCell>'
            )
            estilo_marca = ESTILO_MARCA
            if marca.startswith("PK"):
                estilo_marca += "fontStyle=1;fontColor=#E2A83B;"
            celulas.append(
                f'<mxCell id="{rid}_m" value="{escape(marca)}" style="{estilo_marca}" '
                f'vertex="1" parent="{rid}">'
                f'<mxGeometry width="{LARG_MARCA}" height="{ALT_LINHA}" as="geometry"/></mxCell>'
            )
            estilo_campo = ESTILO_CAMPO + ("fontStyle=1;" if marca.startswith("PK") else "")
            celulas.append(
                f'<mxCell id="{rid}_c" value="{escape(atributo)}" style="{estilo_campo}" '
                f'vertex="1" parent="{rid}">'
                f'<mxGeometry x="{LARG_MARCA}" width="{LARG - LARG_MARCA}" '
                f'height="{ALT_LINHA}" as="geometry"/></mxCell>'
            )
            if i == 0:
                ancora[nome] = rid

    for indice, (de, para, card, rotulo, _t) in enumerate(LIGACOES):
        inicio, fim = SETAS.get(card, ("ERmandOne", "ERmany"))
        cor = "#E2A83B" if de == "caso" or para == "caso" else PERDI
        estilo = (
            f"edgeStyle=entityRelationEdgeStyle;rounded=0;html=1;endArrow={fim};"
            f"startArrow={inicio};endFill=0;startFill=0;strokeColor={cor};strokeWidth=1.5;"
            "exitX=0.5;exitY=0.5;entryX=0.5;entryY=0.5;"
        )
        legenda = escape(f"{card} · {rotulo}")
        celulas.append(
            f'<mxCell id="lig_{indice}" value="{legenda}" style="{estilo}" edge="1" '
            f'parent="1" source="{ancora[de]}" target="{ancora[para]}">'
            f'<mxGeometry relative="1" as="geometry"/></mxCell>'
        )

    legenda_texto = (
        "PK chave primária &#8226; FK chave estrangeira &#8226; UK único&#10;"
        "Notação pé de galinha (crow&#39;s foot) &#8226; PostgreSQL 16 + PostGIS&#10;"
        "índice GIST obrigatório em local.ponto"
    )
    celulas.append(
        f'<mxCell id="legenda" value="{legenda_texto}" '
        f'style="text;html=1;align=left;verticalAlign=top;fontSize=12;fontColor=#5F7076;'
        f'whiteSpace=wrap;" vertex="1" parent="1">'
        f'<mxGeometry x="80" y="1330" width="620" height="70" as="geometry"/></mxCell>'
    )
    celulas.append(
        '<mxCell id="titulo" value="Achei um Bicho — modelo entidade-relacionamento" '
        'style="text;html=1;align=left;verticalAlign=middle;fontSize=22;fontStyle=1;'
        'fontColor=#123E4A;" vertex="1" parent="1">'
        '<mxGeometry x="80" y="10" width="900" height="40" as="geometry"/></mxCell>'
    )

    corpo = "\n        ".join(celulas)
    xml = f"""<mxfile host="app.diagrams.net" type="device">
  <diagram id="achei-um-bicho-er" name="Modelo ER">
    <mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1"
                  connect="1" arrows="1" fold="1" page="1" pageScale="1"
                  pageWidth="1600" pageHeight="1400" math="0" shadow="0" background="{CHUVA}">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        {corpo}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
"""
    SAIDA.write_text(xml, encoding="utf-8")
    print(f"{SAIDA.relative_to(RAIZ)} — {len(ENTIDADES)} tabelas, {len(LIGACOES)} relações")


if __name__ == "__main__":
    gerar()
