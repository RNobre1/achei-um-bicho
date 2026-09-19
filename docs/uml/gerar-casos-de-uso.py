#!/usr/bin/env python3
"""Gera o diagrama de casos de uso do Achei um Bicho em formato .drawio.

Atores, casos de uso e relações estão declarados aqui, uma vez. Para a imagem:

    python3 docs/uml/gerar-casos-de-uso.py
    .venv-slides/bin/python docs/renderizar-drawio.py docs/uml/casos-de-uso.drawio
"""

from pathlib import Path
from xml.sax.saxutils import escape

SAIDA = Path(__file__).resolve().parent / "casos-de-uso.drawio"

TINTA = "#123E4A"
FUNDO_CASO = "#EEF2EE"

# id: (rótulo, x, y)
ATORES = {
    "visitante": ("Visitante", 90, 110),
    "tutor": ("Tutor", 40, 400),
    "encontrou": ("Quem encontrou", 150, 650),
    "relogio": ("Relógio do sistema", 1190, 760),
}

# id: (rótulo, x, y)
CASOS = {
    # casos do tutor em cima, de quem encontrou embaixo, e os dois que ambos usam no
    # meio: assim nenhuma associação atravessa a elipse de outro caso
    "uc03": ("UC03 Consultar casos perto de mim", 330, 70),
    "uc04": ("UC04 Ver caso aberto", 330, 155),
    "uc05": ("UC05 Registrar avistamento", 330, 240),
    "uc07": ("UC07 Reivindicar animal", 330, 340),
    "uc01": ("UC01 Publicar caso de animal perdido", 330, 425),
    "uc06": ("UC06 Ver pistas de pareamento", 330, 510),
    "uc09": ("UC09 Informar desfecho", 330, 595),
    "uc02": ("UC02 Publicar caso de animal encontrado", 330, 680),
    "uc08": ("UC08 Decidir reivindicação", 330, 765),
    "uc10": ("UC10 Cadastrar perguntas de verificação", 820, 500),
    "uc11": ("UC11 Publicar sem conexão", 820, 620),
    "uc12": ("UC12 Expirar caso parado", 820, 780),
}

ASSOCIACOES = [
    ("visitante", "uc03"), ("visitante", "uc04"), ("visitante", "uc05"),
    ("tutor", "uc01"), ("tutor", "uc07"), ("tutor", "uc06"), ("tutor", "uc09"),
    ("encontrou", "uc02"), ("encontrou", "uc08"), ("encontrou", "uc06"), ("encontrou", "uc09"),
    ("relogio", "uc12"),
]

# (origem, destino, estereótipo, pontos de desvio)
DEPENDENCIAS = [
    ("uc01", "uc10", "include", []),
    ("uc02", "uc10", "include", []),
    ("uc11", "uc01", "extend", []),
    ("uc11", "uc02", "extend", []),
    ("uc05", "uc04", "extend", []),
    ("uc07", "uc04", "extend", [(640, 370), (640, 185)]),
]

GENERALIZACOES = [("tutor", "visitante"), ("encontrou", "visitante")]

LARG_CASO, ALT_CASO = 250, 60
LARG_ATOR, ALT_ATOR = 36, 72


def celula(id_, valor, estilo, x, y, w, h):
    return (f'<mxCell id="{id_}" value="{escape(valor)}" style="{estilo}" vertex="1" parent="1">'
            f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')


def aresta(id_, origem, destino, estilo, valor="", pontos=()):
    geometria = '<mxGeometry relative="1" as="geometry">'
    if pontos:
        geometria += '<Array as="points">' + "".join(
            f'<mxPoint x="{x}" y="{y}"/>' for x, y in pontos) + "</Array>"
    geometria += "</mxGeometry>"
    return (f'<mxCell id="{id_}" value="{escape(valor)}" style="{estilo}" edge="1" parent="1" '
            f'source="{origem}" target="{destino}">{geometria}</mxCell>')


def gerar():
    c = [
        celula("fronteira", "Sistema Achei um Bicho",
               f"rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;align=left;spacingLeft=14;"
               f"spacingTop=8;fontStyle=1;fontSize=15;fillColor=none;strokeColor={TINTA};fontColor={TINTA};",
               290, 30, 830, 830),
    ]
    pais = {pai for _, pai in GENERALIZACOES}
    for id_, (rotulo, x, y) in ATORES.items():
        posicao = "verticalLabelPosition=top;verticalAlign=bottom;" if id_ in pais else \
            "verticalLabelPosition=bottom;verticalAlign=top;"
        c.append(celula(id_, rotulo,
                        f"shape=umlActor;{posicao}html=1;"
                        f"outlineConnect=0;strokeColor={TINTA};fontColor={TINTA};fontSize=13;",
                        x, y, LARG_ATOR, ALT_ATOR))
    for id_, (rotulo, x, y) in CASOS.items():
        c.append(celula(id_, rotulo,
                        f"ellipse;whiteSpace=wrap;html=1;fillColor={FUNDO_CASO};strokeColor={TINTA};"
                        f"fontColor={TINTA};fontSize=12;",
                        x, y, LARG_CASO, ALT_CASO))

    for i, (ator, caso) in enumerate(ASSOCIACOES):
        c.append(aresta(f"assoc{i}", ator, caso, f"endArrow=none;html=1;strokeColor={TINTA};"))
    for i, (origem, destino, tipo, pontos) in enumerate(DEPENDENCIAS):
        c.append(aresta(f"dep{i}", origem, destino,
                        f"endArrow=open;endFill=0;dashed=1;html=1;strokeColor={TINTA};"
                        f"fontColor={TINTA};fontSize=11;labelBackgroundColor=#FFFFFF;",
                        f"«{tipo}»", pontos))
    for i, (filho, pai) in enumerate(GENERALIZACOES):
        c.append(aresta(f"gen{i}", filho, pai,
                        f"endArrow=block;endFill=0;endSize=12;html=1;strokeColor={TINTA};"))

    corpo = "\n        ".join(c)
    SAIDA.write_text(f"""<mxfile host="app.diagrams.net" type="device">
  <diagram id="casos-de-uso" name="Casos de uso">
    <mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1"
                  arrows="1" fold="1" page="1" pageScale="1" pageWidth="1300" pageHeight="900"
                  math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        {corpo}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
""", encoding="utf-8")
    print(f"{SAIDA.name}: {len(ATORES)} atores, {len(CASOS)} casos de uso")


if __name__ == "__main__":
    gerar()
