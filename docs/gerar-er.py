#!/usr/bin/env python3
"""Gera o diagrama entidade-relacionamento do Achei um Bicho em SVG.

Fonte única do desenho: as entidades e ligações estão declaradas aqui. Rodar:

    python3 docs/gerar-er.py

Saída: docs/er-diagrama.svg (e o PNG é renderizado a partir dele).
"""

import math
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "docs" / "er-diagrama.svg"

TAPAJOS = "#123E4A"
PERDI = "#2F8587"
ACHEI = "#B6AA95"
ALTER = "#E2A83B"
CHUVA = "#EEF2EE"
TRACO = "#C7D0CB"
APAGADO = "#5F7076"

LARG_CAIXA = 300
ALT_LINHA = 21
ALT_CABECA = 34
PAD = 9

# nome -> (x, y, [(atributo, marca)]), marca em {"PK","FK","UK",""}
ENTIDADES = {
    "pessoa": (60, 70, [
        ("id", "PK"), ("nome", ""), ("telefone", ""),
        ("email", "UK"), ("senha_hash", ""),
    ]),
    "local": (470, 70, [
        ("id", "PK"), ("ponto  geography(Point,4326)", ""),
        ("bairro", ""), ("raio_imprecisao_m", ""),
    ]),
    "animal": (880, 70, [
        ("id", "PK"), ("especie", ""), ("porte", ""),
        ("cor_dominante", ""), ("coleira", ""), ("nome", ""),
    ]),
    "foto": (1290, 70, [
        ("id", "PK"), ("animal_id", "FK"), ("caminho", ""),
    ]),
    "avistamento": (60, 470, [
        ("id", "PK"), ("caso_id", "FK"), ("pessoa_id", "FK"),
        ("local_id", "FK"), ("visto_em", ""),
    ]),
    "caso": (470, 430, [
        ("id", "PK"), ("tipo", ""), ("estado", ""),
        ("autor_id", "FK"), ("animal_id", "FK"), ("local_id", "FK"),
        ("codigo_edicao", "UK"), ("ultima_interacao_em", ""),
    ]),
    "pareamento": (880, 430, [
        ("id", "PK"), ("caso_perdido_id", "FK"), ("caso_encontrado_id", "FK"),
        ("distancia_m", ""), ("atributos_batem", ""),
        ("atributos_divergem", ""), ("veredito", ""),
    ]),
    "desfecho": (1290, 830, [
        ("id", "PK"), ("caso_id", "FK UK"), ("tipo", ""), ("ocorrido_em", ""),
    ]),
    "tentativa_verificacao": (60, 830, [
        ("id", "PK"), ("caso_id", "FK"), ("pessoa_id", "FK"), ("veredito", ""),
    ]),
    "resposta_verificacao": (470, 830, [
        ("id", "PK"), ("tentativa_id", "FK"), ("pergunta_id", "FK"), ("texto", ""),
    ]),
    "pergunta_verificacao": (880, 830, [
        ("id", "PK"), ("caso_id", "FK"), ("ordem", ""),
        ("enunciado", ""), ("resposta_esperada  🔒", ""),
    ]),
}

DESTAQUE = {"caso"}
SENSIVEL = {"pergunta_verificacao"}

# (de, para, cardinalidade, rótulo, posição do rótulo no segmento)
LIGACOES = [
    ("pessoa", "caso", "1:N", "publica", 0.66),
    ("pessoa", "avistamento", "1:N", "registra", 0.5),
    ("pessoa", "tentativa_verificacao", "1:N", "reivindica", 0.78),
    ("local", "caso", "1:1", "onde", 0.5),
    ("local", "avistamento", "1:N", "onde", 0.34),
    ("animal", "caso", "1:1", "descreve", 0.5),
    ("animal", "foto", "1:N", "tem", 0.5),
    ("caso", "avistamento", "1:N", "recebe", 0.5),
    ("caso", "pareamento", "1:N", "lados", 0.5),
    ("caso", "desfecho", "1:0..1", "termina", 0.55),
    ("caso", "pergunta_verificacao", "1:3", "define", 0.5),
    ("caso", "tentativa_verificacao", "1:N", "recebe", 0.5),
    ("tentativa_verificacao", "resposta_verificacao", "1:3", "contém", 0.5),
    ("pergunta_verificacao", "resposta_verificacao", "1:N", "responde", 0.5),
]


def altura(nome):
    return ALT_CABECA + len(ENTIDADES[nome][2]) * ALT_LINHA + PAD


def retangulo_de(nome):
    x, y, _ = ENTIDADES[nome]
    return x, y, LARG_CAIXA, altura(nome)


def borda(nome, alvo_cx, alvo_cy):
    """Ponto onde a reta até (alvo_cx, alvo_cy) cruza a borda da caixa."""
    x, y, w, h = retangulo_de(nome)
    cx, cy = x + w / 2, y + h / 2
    dx, dy = alvo_cx - cx, alvo_cy - cy
    if dx == 0 and dy == 0:
        return cx, cy
    escala_x = (w / 2) / abs(dx) if dx else math.inf
    escala_y = (h / 2) / abs(dy) if dy else math.inf
    k = min(escala_x, escala_y)
    return cx + dx * k, cy + dy * k


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def gerar():
    partes = []
    largura_total = 1660
    altura_total = 1120

    partes.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{largura_total}" '
        f'height="{altura_total}" viewBox="0 0 {largura_total} {altura_total}" '
        f'font-family="IBM Plex Sans, Helvetica, Arial, sans-serif">'
    )
    partes.append(f'<rect width="{largura_total}" height="{altura_total}" fill="{CHUVA}"/>')

    # título
    partes.append(
        f'<text x="60" y="42" font-size="21" font-weight="700" fill="{TAPAJOS}">'
        f'Achei um Bicho — modelo entidade-relacionamento</text>'
    )

    # ligações primeiro, para ficarem atrás das caixas
    for de, para, card, rotulo, t in LIGACOES:
        xd, yd, wd, hd = retangulo_de(de)
        xp, yp, wp, hp = retangulo_de(para)
        cdx, cdy = xd + wd / 2, yd + hd / 2
        cpx, cpy = xp + wp / 2, yp + hp / 2
        x1, y1 = borda(de, cpx, cpy)
        x2, y2 = borda(para, cdx, cdy)
        cor = ALTER if de == "caso" or para == "caso" else PERDI
        partes.append(
            f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" '
            f'stroke="{cor}" stroke-width="1.6"/>'
        )
        partes.append(f'<circle cx="{x1:.0f}" cy="{y1:.0f}" r="3.4" fill="{cor}"/>')
        partes.append(f'<circle cx="{x2:.0f}" cy="{y2:.0f}" r="3.4" fill="{cor}"/>')

        mx, my = x1 + (x2 - x1) * t, y1 + (y2 - y1) * t
        texto = f"{card} · {rotulo}"
        meia = len(texto) * 3.1 + 7
        partes.append(
            f'<rect x="{mx - meia:.0f}" y="{my - 9:.0f}" width="{meia * 2:.0f}" height="18" '
            f'fill="{CHUVA}" stroke="{TRACO}" stroke-width="0.8"/>'
        )
        partes.append(
            f'<text x="{mx:.0f}" y="{my + 4:.0f}" font-size="10.5" text-anchor="middle" '
            f'font-family="IBM Plex Mono, monospace" fill="{APAGADO}">{esc(texto)}</text>'
        )

    # caixas
    for nome, (x, y, atributos) in ENTIDADES.items():
        h = altura(nome)
        destaque = nome in DESTAQUE
        cor_cabeca = TAPAJOS if destaque else PERDI
        if nome in SENSIVEL:
            cor_cabeca = "#8C7F66"

        partes.append(
            f'<rect x="{x}" y="{y}" width="{LARG_CAIXA}" height="{h}" fill="#FFFFFF" '
            f'stroke="{TAPAJOS if destaque else TRACO}" '
            f'stroke-width="{2.2 if destaque else 1}"/>'
        )
        partes.append(
            f'<rect x="{x}" y="{y}" width="{LARG_CAIXA}" height="{ALT_CABECA}" fill="{cor_cabeca}"/>'
        )
        partes.append(
            f'<text x="{x + 12}" y="{y + 23}" font-size="14.5" font-weight="700" '
            f'fill="{CHUVA}" font-family="IBM Plex Mono, monospace">{esc(nome)}</text>'
        )

        for i, (atributo, marca) in enumerate(atributos):
            ty = y + ALT_CABECA + 15 + i * ALT_LINHA
            if i:
                partes.append(
                    f'<line x1="{x + 1}" y1="{ty - 15}" x2="{x + LARG_CAIXA - 1}" '
                    f'y2="{ty - 15}" stroke="#EDF0EC" stroke-width="1"/>'
                )
            negrito = "700" if marca.startswith("PK") else "400"
            partes.append(
                f'<text x="{x + 12}" y="{ty}" font-size="12" fill="{TAPAJOS}" '
                f'font-weight="{negrito}" font-family="IBM Plex Mono, monospace">'
                f'{esc(atributo)}</text>'
            )
            if marca:
                cor_marca = ALTER if marca.startswith("PK") else APAGADO
                partes.append(
                    f'<text x="{x + LARG_CAIXA - 12}" y="{ty}" font-size="9.5" '
                    f'text-anchor="end" fill="{cor_marca}" letter-spacing="0.8" '
                    f'font-family="IBM Plex Mono, monospace">{esc(marca)}</text>'
                )

    # legenda
    ly = altura_total - 52
    partes.append(f'<line x1="60" y1="{ly - 22}" x2="{largura_total - 60}" y2="{ly - 22}" stroke="{TRACO}"/>')
    legenda = (
        "PK chave primária · FK chave estrangeira · UK único · "
        "🔒 nunca sai da API · índice GIST obrigatório em local.ponto"
    )
    partes.append(
        f'<text x="60" y="{ly + 2}" font-size="12" fill="{APAGADO}" '
        f'font-family="IBM Plex Mono, monospace">{esc(legenda)}</text>'
    )
    partes.append(
        f'<text x="{largura_total - 60}" y="{ly + 2}" font-size="12" text-anchor="end" '
        f'fill="{APAGADO}" font-family="IBM Plex Mono, monospace">'
        f'PostgreSQL 16 + PostGIS · v1.0 · 09/09/2026</text>'
    )

    partes.append("</svg>")
    SAIDA.write_text("\n".join(partes), encoding="utf-8")
    print(f"{SAIDA.relative_to(RAIZ)} — {len(ENTIDADES)} entidades, {len(LIGACOES)} ligações")


if __name__ == "__main__":
    gerar()
