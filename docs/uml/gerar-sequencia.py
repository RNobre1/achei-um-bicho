#!/usr/bin/env python3
"""Gera o diagrama de sequência "publicar um caso e receber pistas" em .drawio.

Participantes e mensagens estão declarados aqui, uma vez, com os nomes das classes
e rotas reais da API. Para a imagem:

    python3 docs/uml/gerar-sequencia.py
    .venv-slides/bin/python docs/renderizar-drawio.py docs/uml/sequencia-publicar.drawio
"""

from pathlib import Path
from xml.sax.saxutils import escape as _escape


def escape(texto: str) -> str:
    """Escapa também as aspas: o texto vai dentro de atributo XML."""
    return _escape(texto, {'"': "&quot;"})


SAIDA = Path(__file__).resolve().parent / "sequencia-publicar.drawio"

TINTA = "#123E4A"
FUNDO = "#EEF2EE"

# id: rótulo, na ordem em que aparecem da esquerda para a direita
PARTICIPANTES = {
    "pessoa": "Quem publica",
    "app": "Aplicativo",
    "casosController": "CasosController",
    "casosService": "CasosService",
    "casosRepositorio": "CasosRepositorio",
    "gerador": "GeradorDePareamentos",
    "pistasController": "PistasController",
    "banco": "PostgreSQL + PostGIS",
}

# (de, para, texto, tipo): "chamada" é síncrona, "retorno" vem tracejado,
# e de == para desenha uma mensagem para si mesmo
MENSAGENS = [
    ("pessoa", "app", "preenche os quatro passos e toca em Publicar", "chamada"),
    ("app", "casosController", "POST /casos (NovaPublicacao)", "chamada"),
    ("casosController", "casosService", "publicar(dados), já validados", "chamada"),
    ("casosService", "casosRepositorio", "criar(dados, estado inicial, hash do código)", "chamada"),
    ("casosRepositorio", "banco", "INSERT pessoa, local, animal, caso e perguntas, numa transação", "chamada"),
    ("casosService", "gerador", "gerarPara(casoId)", "chamada"),
    ("gerador", "banco", "candidatos: lado oposto, mesma espécie, ST_DWithin 5 km", "chamada"),
    ("banco", "gerador", "candidatos com a distância em metros", "retorno"),
    ("gerador", "gerador", "compararCasos: o que bateu e o que não bateu", "chamada"),
    ("gerador", "banco", "INSERT pareamento (veredito pendente)", "chamada"),
    ("casosController", "app", "201 { id, codigoEdicao }", "retorno"),
    ("app", "app", "guarda o código de edição no aparelho", "chamada"),
    ("app", "pistasController", "GET /casos/:id/pistas, cabeçalho x-codigo-edicao", "chamada"),
    ("pistasController", "banco", "pares não descartados do caso", "chamada"),
    ("pistasController", "app", "pistas, sem nota e sem contato", "retorno"),
    ("app", "pessoa", "\"Pode ser o mesmo bicho\"", "retorno"),
]

LARGURA = 150
ESPACO = 175
TOPO = 40
ALTURA_CABECA = 46
PASSO = 46


def centro(id_: str) -> int:
    indice = list(PARTICIPANTES).index(id_)
    return 40 + indice * ESPACO + LARGURA // 2


def gerar():
    altura = ALTURA_CABECA + PASSO * (len(MENSAGENS) + 1) + 30
    celulas = []
    for indice, (id_, rotulo) in enumerate(PARTICIPANTES.items()):
        estilo = (
            f"shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=0;"
            f"collapsible=0;recursiveResize=0;outlineConnect=0;size={ALTURA_CABECA};"
            f"fillColor={FUNDO};strokeColor={TINTA};fontColor={TINTA};fontSize=12;fontStyle=1;"
        )
        celulas.append(
            f'<mxCell id="{id_}" value="{escape(rotulo)}" style="{estilo}" vertex="1" parent="1">'
            f'<mxGeometry x="{40 + indice * ESPACO}" y="{TOPO}" width="{LARGURA}" height="{altura}" as="geometry"/></mxCell>'
        )

    for numero, (de, para, texto, tipo) in enumerate(MENSAGENS, start=1):
        y = TOPO + ALTURA_CABECA + PASSO * numero
        rotulo = f"{numero}. {texto}"
        tracejado = "dashed=1;endArrow=open;endFill=0;" if tipo == "retorno" else "endArrow=block;endFill=1;"
        base = (
            f"html=1;rounded=0;{tracejado}strokeColor={TINTA};fontColor={TINTA};fontSize=11;"
            f"labelBackgroundColor=#FFFFFF;verticalAlign=bottom;"
        )
        if de == para:
            x = centro(de)
            celulas.append(
                f'<mxCell id="m{numero}" value="{escape(rotulo)}" style="{base}align=left;spacingLeft=6;" edge="1" parent="1">'
                f'<mxGeometry relative="1" as="geometry"><mxPoint x="{x}" y="{y - 14}" as="sourcePoint"/>'
                f'<mxPoint x="{x}" y="{y + 10}" as="targetPoint"/><Array as="points">'
                f'<mxPoint x="{x + 36}" y="{y - 14}"/><mxPoint x="{x + 36}" y="{y + 10}"/></Array></mxGeometry></mxCell>'
            )
            continue
        celulas.append(
            f'<mxCell id="m{numero}" value="{escape(rotulo)}" style="{base}" edge="1" parent="1">'
            f'<mxGeometry relative="1" as="geometry"><mxPoint x="{centro(de)}" y="{y}" as="sourcePoint"/>'
            f'<mxPoint x="{centro(para)}" y="{y}" as="targetPoint"/></mxGeometry></mxCell>'
        )

    corpo = "\n        ".join(celulas)
    largura_pagina = 80 + len(PARTICIPANTES) * ESPACO
    SAIDA.write_text(f"""<mxfile host="app.diagrams.net" type="device">
  <diagram id="sequencia-publicar" name="Publicar um caso e receber pistas">
    <mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1"
                  arrows="1" fold="1" page="1" pageScale="1" pageWidth="{largura_pagina}" pageHeight="{altura + 80}"
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
    print(f"{SAIDA.name}: {len(PARTICIPANTES)} participantes, {len(MENSAGENS)} mensagens")


if __name__ == "__main__":
    gerar()
