#!/usr/bin/env python3
"""Gera a linha do tempo do cronograma em SVG.

Substitui o gráfico em caracteres que ficava no documento. As datas abaixo são a
fonte: mudar uma sprint aqui redesenha a figura inteira, com as larguras
recalculadas.

    python3 docs/gerar-linha-do-tempo.py

Saída: docs/linha-do-tempo.svg
"""

from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "docs" / "linha-do-tempo.svg"

TAPAJOS = "#123E4A"
PERDI = "#2F8587"
SILTE = "#B6AA95"
ALTER = "#E2A83B"
CHUVA = "#EEF2EE"
APAGADO = "#5F7076"
TRACO = "#C7D0CB"

INICIO = date(2026, 9, 9)
FIM = date(2026, 11, 22)

# (rótulo, nome, início, fim, cor)
SPRINTS = [
    ("S0", "Fundação", date(2026, 9, 9), date(2026, 9, 18), TAPAJOS),
    ("S1", "Publicar e ver", date(2026, 9, 19), date(2026, 10, 2), PERDI),
    ("S2", "Aproximar", date(2026, 10, 3), date(2026, 10, 8), PERDI),
    ("S3", "Proteger", date(2026, 10, 10), date(2026, 10, 23), SILTE),
    ("S4", "Fechar o ciclo", date(2026, 10, 24), date(2026, 11, 6), SILTE),
    ("S5", "Fechamento", date(2026, 11, 7), date(2026, 11, 20), TAPAJOS),
]

MARCOS = [
    (date(2026, 10, 9), "Alpha Release"),
    (date(2026, 11, 21), "Pitch Final"),
]

MESES = [
    (date(2026, 9, 9), date(2026, 9, 30), "setembro"),
    (date(2026, 10, 1), date(2026, 10, 31), "outubro"),
    (date(2026, 11, 1), date(2026, 11, 22), "novembro"),
]

LARG = 1150
ALT = 360
MARGEM = 46
UTIL = LARG - 2 * MARGEM
DIAS = (FIM - INICIO).days

Y_MES = 88
Y_BARRA = 140
H_BARRA = 58
Y_NOME = 232
Y_MARCO_TOPO = 118
Y_MARCO_BASE = 292


def x(dia):
    return MARGEM + UTIL * (dia - INICIO).days / DIAS


def br(d):
    return d.strftime("%d/%m")


def gerar():
    p = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{LARG}" height="{ALT}" '
        f'viewBox="0 0 {LARG} {ALT}" font-family="IBM Plex Sans, Helvetica, Arial, sans-serif">',
        f'<rect width="{LARG}" height="{ALT}" fill="{CHUVA}"/>',
        f'<text x="{MARGEM}" y="46" font-size="25" font-weight="700" fill="{TAPAJOS}">'
        f'De 9 de setembro ao pitch final</text>',
    ]

    # faixa dos meses
    for inicio_mes, fim_mes, nome in MESES:
        x1, x2 = x(inicio_mes), x(fim_mes)
        p.append(f'<rect x="{x1:.0f}" y="{Y_MES}" width="{x2 - x1:.0f}" height="30" '
                 f'fill="#E3E8E3"/>')
        p.append(f'<text x="{(x1 + x2) / 2:.0f}" y="{Y_MES + 20}" font-size="14" '
                 f'text-anchor="middle" letter-spacing="1.6" fill="{APAGADO}">'
                 f'{nome.upper()}</text>')
        p.append(f'<line x1="{x2:.0f}" y1="{Y_MES}" x2="{x2:.0f}" y2="{Y_MARCO_BASE}" '
                 f'stroke="{TRACO}" stroke-width="1"/>')

    # barras das sprints
    for rotulo, nome, inicio, fim, cor in SPRINTS:
        x1, x2 = x(inicio), x(fim)
        largura = x2 - x1
        p.append(f'<rect x="{x1:.0f}" y="{Y_BARRA}" width="{largura:.0f}" '
                 f'height="{H_BARRA}" fill="{cor}"/>')
        claro = CHUVA if cor in (TAPAJOS, PERDI) else TAPAJOS
        p.append(f'<text x="{x1 + largura / 2:.0f}" y="{Y_BARRA + 37}" font-size="20" '
                 f'font-weight="700" text-anchor="middle" fill="{claro}">{rotulo}</text>')
        p.append(f'<text x="{x1 + largura / 2:.0f}" y="{Y_NOME}" font-size="16" '
                 f'text-anchor="middle" fill="{TAPAJOS}">{nome}</text>')
        p.append(f'<text x="{x1 + largura / 2:.0f}" y="{Y_NOME + 23}" font-size="13.5" '
                 f'text-anchor="middle" font-family="IBM Plex Mono, monospace" '
                 f'fill="{APAGADO}">{br(inicio)} a {br(fim)}</text>')

    # marcos
    for dia, nome in MARCOS:
        xm = x(dia)
        # a linha pula o bloco de texto da sprint em vez de riscar por cima dele
        p.append(f'<line x1="{xm:.0f}" y1="{Y_MARCO_TOPO}" x2="{xm:.0f}" '
                 f'y2="{Y_BARRA + H_BARRA}" stroke="{ALTER}" stroke-width="3"/>')
        p.append(f'<line x1="{xm:.0f}" y1="{Y_NOME + 34}" x2="{xm:.0f}" '
                 f'y2="{Y_MARCO_BASE + 16}" stroke="{ALTER}" stroke-width="3"/>')
        p.append(f'<circle cx="{xm:.0f}" cy="{Y_MARCO_TOPO}" r="9" fill="{ALTER}" '
                 f'stroke="{TAPAJOS}" stroke-width="1.5"/>')
        largura_etiqueta = len(nome) * 9.2 + 76
        xe = min(xm - largura_etiqueta / 2, LARG - MARGEM - largura_etiqueta)
        p.append(f'<rect x="{xe:.0f}" y="{Y_MARCO_BASE + 16}" width="{largura_etiqueta:.0f}" '
                 f'height="38" fill="{ALTER}"/>')
        p.append(f'<text x="{xe + largura_etiqueta / 2:.0f}" y="{Y_MARCO_BASE + 41}" '
                 f'font-size="16" font-weight="700" text-anchor="middle" fill="{TAPAJOS}">'
                 f'{br(dia)} · {nome}</text>')

    # marca do dia de hoje, na ponta esquerda
    p.append(f'<text x="{MARGEM}" y="{Y_MARCO_BASE + 41}" font-size="15" '
             f'font-family="IBM Plex Mono, monospace" fill="{APAGADO}">hoje · 09/09</text>')

    p.append("</svg>")
    SAIDA.write_text("\n".join(p), encoding="utf-8")
    print(f"{SAIDA.relative_to(RAIZ)} — {DIAS} dias, {len(SPRINTS)} sprints, {len(MARCOS)} marcos")


if __name__ == "__main__":
    gerar()
