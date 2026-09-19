#!/usr/bin/env python3
"""Renderiza um arquivo .drawio em PNG com o visualizador oficial do draw.io.

A imagem sai do mesmo XML que se abre no draw.io, então as duas nunca divergem.
Precisa de rede (o visualizador vem do CDN do draw.io) e do Chromium headless que
o Playwright instala.

    .venv-slides/bin/python docs/renderizar-drawio.py docs/uml/casos-de-uso.drawio
"""

import html
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageChops


def achar_chromium() -> str:
    """O Playwright troca a pasta a cada versão; procurar evita caminho fixo quebrado."""
    base = Path.home() / "Library/Caches/ms-playwright"
    candidatos = sorted(base.glob("chromium_headless_shell-*/*/chrome-headless-shell"))
    if not candidatos:
        sys.exit("Chromium headless não encontrado: rode `npx playwright install chromium`")
    return str(candidatos[-1])


def cortar_margem(caminho: Path, folga: int = 24) -> None:
    imagem = Image.open(caminho).convert("RGB")
    fundo = Image.new("RGB", imagem.size, (255, 255, 255))
    caixa = ImageChops.difference(imagem, fundo).getbbox()
    if caixa:
        x0, y0, x1, y1 = caixa
        imagem = imagem.crop((max(0, x0 - folga), max(0, y0 - folga),
                              min(imagem.width, x1 + folga), min(imagem.height, y1 + folga)))
    imagem.save(caminho)


def renderizar(origem: Path, destino: Path, largura: int = 2400, altura: int = 1800) -> None:
    xml = origem.read_text(encoding="utf-8")
    config = json.dumps({"xml": xml, "toolbar": "", "lightbox": False, "nav": False})
    pagina = (
        '<!doctype html><html><head><meta charset="utf-8">'
        "<style>body{margin:0;background:#fff}</style></head><body>"
        f'<div class="mxgraph" data-mxgraph="{html.escape(config)}"></div>'
        '<script src="https://viewer.diagrams.net/js/viewer-static.min.js"></script>'
        "</body></html>"
    )
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as f:
        f.write(pagina)
        temporario = f.name
    subprocess.run(
        [achar_chromium(), "--headless", "--disable-gpu", "--hide-scrollbars",
         "--force-device-scale-factor=2", "--virtual-time-budget=15000",
         f"--window-size={largura},{altura}", f"--screenshot={destino}", f"file://{temporario}"],
        check=True, capture_output=True,
    )
    Path(temporario).unlink()
    cortar_margem(destino)


if __name__ == "__main__":
    for argumento in sys.argv[1:]:
        origem = Path(argumento)
        destino = origem.with_suffix(".png")
        renderizar(origem, destino)
        print(f"{destino}")
