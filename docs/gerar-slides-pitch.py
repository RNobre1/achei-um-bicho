#!/usr/bin/env python3
"""Gera o deck do pitch final do Achei um Bicho (21/11/2026).

Reaproveita as peças dos decks do kickoff (docs/gerar-slides.py) e do alpha
(docs/gerar-slides-alpha.py): mesmas cores, fontes, capa e slide de tela. As telas
são prints da versão web com o GPS no campus da UFOPA, em docs/pitch/telas/.

    .venv-slides/bin/python docs/gerar-slides-pitch.py

Saída: Achei_um_Bicho_Pitch_Final.pptx na raiz do projeto.
"""

import importlib.util
from datetime import datetime
from pathlib import Path

from pptx import Presentation
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches

RAIZ = Path(__file__).resolve().parent.parent
PITCH = RAIZ / "docs" / "pitch"
TELAS = PITCH / "telas"
UML = RAIZ / "docs" / "uml"
ARQUITETURA = RAIZ / "docs" / "artigo" / "figuras" / "arquitetura.png"
SAIDA = RAIZ / "Achei_um_Bicho_Pitch_Final.pptx"


def _carregar(nome, arquivo):
    spec = importlib.util.spec_from_file_location(nome, RAIZ / "docs" / arquivo)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


k = _carregar("kickoff", "gerar-slides.py")
alpha = _carregar("alpha", "gerar-slides-alpha.py")

# os links vêm do deck do alpha, que já os confere: uma fonte só
# testes da versão final (pnpm test em 12/11); os mesmos números estão no artigo
TESTES = [
    ("Contratos e vocabulário", 68),
    ("API, unidade", 90),
    ("API, integração com PostgreSQL e PostGIS", 253),
    ("Aplicativo, regras de tela", 237),
]
TESTES_PONTA_A_PONTA = 6
LINK_WEB = alpha.LINK_WEB
LINK_APK = alpha.LINK_APK

# Resultado medido do teste de carga (docs/qualidade/carga.md). Atualizar junto.
CARGA = {"p95": "26 ms", "rps": "435", "erros": "0%"}

FUNCIONALIDADES = [
    ("F1", "Publicar bicho perdido"),
    ("F2", "Publicar bicho encontrado, sem conta"),
    ("F3", "Mural por proximidade"),
    ("F4", "Caso aberto e avistamento"),
    ("F5", "Pareamento explicado"),
    ("F6", "Verificação por sinal particular"),
    ("F7", "Contato mediado, com denúncia"),
    ("F8", "Ciclo de vida: desfecho, cobrança e expiração"),
    ("F9", "Publicar sem conexão"),
]

TELAS_DECK = [
    dict(arquivo="01-casos-perto.png", extra="02-pistas.png", titulo="Perto de casa, e explicado",
         resolve="O mural abre num raio de 1,6 km, e cada par mostra o que bateu e o que não bateu.",
         pontos=[
             "Consulta por raio no banco, com índice espacial: o mural não varre a cidade.",
             "Sem nota nem porcentagem. Quem decide se é o mesmo bicho é uma pessoa.",
         ], fs=["F3", "F5"]),
    dict(arquivo="03-reivindicar.png", extra="04-respostas-do-autor.png", titulo="Prova antes de falar",
         resolve="Quem diz que o bicho é seu responde às três perguntas de quem publicou.",
         pontos=[
             "O autor vê as respostas ao lado das que cadastrou, e as denúncias contra aquele telefone.",
             "O aplicativo diz, com todas as letras, que não decide de quem é o animal.",
         ], fs=["F6"]),
    dict(arquivo="05-contato-liberado.png", extra="06-encerrar.png", titulo="Contato só depois do aceite",
         resolve="Telefone e referência aparecem para os dois lados só quando o autor aceita.",
         pontos=[
             "Aviso fixo: não pague para receber o animal; encontro em lugar público.",
             "Todo caso termina com desfecho, e caso parado é cobrado e expira sozinho.",
         ], fs=["F7", "F8"]),
    dict(arquivo="07-fila.png", extra="08-sem-conexao.png", titulo="Sem sinal, sem perder o caso",
         resolve="O caso fica guardado no celular e sobe sozinho quando a internet volta.",
         pontos=[
             "A tela nunca diz “publicado” antes do servidor confirmar.",
             "O mural e os casos já abertos continuam legíveis sem conexão.",
         ], fs=["F9"]),
]


def slide_problema(prs, numero):
    s = k.novo_slide(prs)
    k.texto(s, "O PROBLEMA", esq=0.95, topo=0.95, larg=6, alt=0.3, tam=11,
            fonte=k.DADO_FONTE, cor=k.PERDI, entreletras=1.4)
    k.texto(s, ["Quem perdeu e quem achou", "estão no mesmo bairro."], esq=0.9, topo=1.4,
            larg=7.2, alt=2.0, tam=36, fonte=k.TITULO_FONTE, cor=k.TAPAJOS, negrito=True,
            espaco=1.05)
    k.texto(s,
            "Em Santarém as duas mensagens circulam no mesmo dia, em grupos de WhatsApp "
            "diferentes, e ninguém as compara.",
            esq=0.9, topo=3.55, larg=6.6, alt=1.2, tam=17, cor=k.TEXTO, espaco=1.35)
    for i, (valor, legenda) in enumerate([
        ("70%", "dos cães devolvidos estavam a até 1,6 km de casa"),
        ("75%", "dos gatos achados estavam a menos de 500 m"),
    ]):
        y = 1.5 + i * 2.05
        k.retangulo(s, esq=8.3, topo=y, larg=4.1, alt=0.045, cor=[k.PERDI, k.ALTER][i])
        k.texto(s, valor, esq=8.3, topo=y + 0.15, larg=4, alt=0.9, tam=46,
                fonte=k.TITULO_FONTE, cor=k.TAPAJOS, negrito=True)
        k.texto(s, legenda, esq=8.3, topo=y + 1.05, larg=4, alt=0.7, tam=13.5,
                cor=k.APAGADO, espaco=1.3)
    k.texto(s, "Kremer (2021), dados de Dallas; Huang et al. (2018). A validar em Santarém.",
            esq=0.9, topo=6.25, larg=11.5, alt=0.3, tam=9.5, cor=k.APAGADO)
    k.rodape(s, numero)


def slide_entrega(prs, numero, qr_web):
    s = k.novo_slide(prs)
    k.texto(s, "O QUE ENTREGAMOS", esq=0.95, topo=0.72, larg=8, alt=0.3, tam=11,
            fonte=k.DADO_FONTE, cor=k.PERDI, entreletras=1.4)
    k.texto(s, "Nove de nove, no ar", esq=0.9, topo=1.12, larg=8.5, alt=0.8, tam=38,
            fonte=k.TITULO_FONTE, cor=k.TAPAJOS, negrito=True)
    for i, (codigo, nome) in enumerate(FUNCIONALIDADES):
        y = 2.2 + i * 0.47
        k.etiqueta(s, codigo, esq=0.9, topo=y, cor_fundo=k.PERDI, larg=0.5)
        k.texto(s, nome, esq=1.6, topo=y + 0.02, larg=6.4, alt=0.3, tam=15,
                cor=k.TAPAJOS, negrito=True)
    k.retangulo(s, esq=9.5, topo=2.05, larg=2.95, alt=4.35, cor=k.TAPAJOS)
    k.texto(s, "ABRA AGORA", esq=9.8, topo=2.35, larg=2.4, alt=0.3, tam=10, fonte=k.DADO_FONTE,
            cor=k.RGBColor(0x8F, 0xB4, 0xB2), entreletras=1.4)
    k.texto(s, "A versão web está no ar", esq=9.8, topo=2.68, larg=2.45, alt=0.8, tam=19,
            fonte=k.TITULO_FONTE, cor=k.CHUVA, negrito=True, espaco=1.05)
    s.shapes.add_picture(str(qr_web), Inches(10.12), Inches(3.75), height=Inches(1.75))
    k.texto(s, "achei-um-bicho.onrender.com", esq=9.75, topo=5.65, larg=2.6, alt=0.4, tam=11,
            fonte=k.DADO_FONTE, cor=k.RGBColor(0xB6, 0xCE, 0xCB), alinha=PP_ALIGN.CENTER)
    k.rodape(s, numero)


def slide_privacidade(prs, numero):
    s = k.novo_slide(prs)
    k.texto(s, "PRIVACIDADE POR CONSTRUÇÃO", esq=0.95, topo=0.72, larg=9, alt=0.3, tam=11,
            fonte=k.DADO_FONTE, cor=k.PERDI, entreletras=1.4)
    k.texto(s, "O que não sai da API, não vaza", esq=0.9, topo=1.12, larg=11.5, alt=0.8, tam=38,
            fonte=k.TITULO_FONTE, cor=k.TAPAJOS, negrito=True)
    itens = [
        ("Área, não endereço", "Círculo de 300 m deslocado por um cálculo com segredo; distâncias e contagens do mural saem do centro publicado."),
        ("Contato mediado", "Telefone só depois do aceite do autor; teste automático confere toda resposta pública."),
        ("Códigos sem conta", "Edição e acompanhamento guardados só como HMAC com segredo do servidor."),
        ("Foto sem rastro", "O celular regrava a foto sem a coordenada da câmera, e a API corta de novo."),
        ("Texto público limpo", "Telefone ou link no relato é recusado: o contato passa pelo app."),
        ("Esquecer depois", "Caso encerrado há 30 dias sai do ar e perde os dados pessoais e os avisos de quem viu."),
    ]
    for i, (titulo, detalhe) in enumerate(itens):
        coluna, linha = divmod(i, 3)
        x = 0.9 + coluna * 6.0
        y = 2.2 + linha * 1.3
        k.retangulo(s, esq=x, topo=y + 0.12, larg=0.16, alt=0.045, cor=k.ALTER)
        k.texto(s, titulo, esq=x + 0.38, topo=y, larg=5.3, alt=0.35, tam=15, cor=k.TAPAJOS, negrito=True)
        k.texto(s, detalhe, esq=x + 0.38, topo=y + 0.36, larg=5.3, alt=0.8, tam=12.5, cor=k.APAGADO, espaco=1.3)
    k.rodape(s, numero)


def slide_arquitetura(prs, numero):
    s = k.novo_slide(prs)
    k.texto(s, "POR DENTRO", esq=0.95, topo=0.72, larg=8, alt=0.3, tam=11,
            fonte=k.DADO_FONTE, cor=k.PERDI, entreletras=1.4)
    k.texto(s, "Três peças, todas grátis", esq=0.9, topo=1.12, larg=11, alt=0.8, tam=38,
            fonte=k.TITULO_FONTE, cor=k.TAPAJOS, negrito=True)
    s.shapes.add_picture(str(ARQUITETURA), Inches(0.9), Inches(2.2), width=Inches(11.5))
    k.texto(s, "Render, Neon, EAS e GitHub Actions no plano gratuito, sem cartão.",
            esq=0.9, topo=6.3, larg=11.5, alt=0.4, tam=13, cor=k.APAGADO)
    k.rodape(s, numero)


def slide_qualidade(prs, numero):
    s = k.novo_slide(prs)
    total = sum(n for _, n in TESTES)
    k.texto(s, "QUALIDADE", esq=0.95, topo=0.72, larg=8, alt=0.3, tam=11, fonte=k.DADO_FONTE,
            cor=k.PERDI, entreletras=1.4)
    k.texto(s, f"{total} testes, escritos antes do código", esq=0.9, topo=1.12, larg=11.5,
            alt=0.8, tam=36, fonte=k.TITULO_FONTE, cor=k.TAPAJOS, negrito=True)
    for i, (camada, n) in enumerate(TESTES):
        x = 0.9 + i * 2.95
        k.retangulo(s, esq=x, topo=2.25, larg=2.7, alt=0.045, cor=[k.PERDI, k.TAPAJOS, k.ALTER, k.ACHEI][i])
        k.texto(s, str(n), esq=x, topo=2.42, larg=2.7, alt=0.9, tam=44, fonte=k.TITULO_FONTE,
                cor=k.TAPAJOS, negrito=True)
        k.texto(s, camada, esq=x, topo=3.32, larg=2.6, alt=0.7, tam=13, cor=k.APAGADO, espaco=1.25)
    k.texto(s, [
        f"Carga do mural com 200 casos: p95 de {CARGA['p95']}, {CARGA['rps']} requisições por segundo, {CARGA['erros']} de erro.",
        "Publicar com foto cabe em menos de 1 MB; todo par de cores passa no contraste AA.",
        f"A cada envio: tipos, todos os testes, {TESTES_PONTA_A_PONTA} testes de ponta a ponta no navegador, CodeQL e auditoria.",
        "Revisão independente de cada parte: achou dois aceites simultâneos e um vazamento de posição, consertados com teste.",
    ], esq=0.9, topo=4.35, larg=11.5, alt=2.2, tam=14, cor=k.TEXTO, espaco=1.35)
    k.rodape(s, numero)


def slide_limites(prs, numero):
    s = k.novo_slide(prs)
    k.texto(s, "O QUE AINDA NÃO SABEMOS", esq=0.95, topo=0.72, larg=9, alt=0.3, tam=11,
            fonte=k.DADO_FONTE, cor=k.PERDI, entreletras=1.4)
    k.texto(s, "Falta a rua", esq=0.9, topo=1.12, larg=11, alt=0.8, tam=38,
            fonte=k.TITULO_FONTE, cor=k.TAPAJOS, negrito=True)
    k.texto(s, [
        "A rodada com protetores de Santarém não aconteceu. Não temos número de reencontros.",
        "Os limites de distância vêm de estudos dos Estados Unidos e precisam ser medidos aqui.",
        "A API grátis dorme depois de 15 minutos e leva cerca de um minuto para acordar.",
        "Código de edição perdido não tem volta sem conta: é o preço de não pedir cadastro.",
    ], esq=0.9, topo=2.25, larg=11.5, alt=3.0, tam=17, cor=k.TEXTO, espaco=1.45)
    k.rodape(s, numero)


def slide_fecho(prs, qr_web, qr_apk):
    s = k.novo_slide(prs, fundo=k.TAPAJOS)
    k.retangulo(s, esq=0, topo=0, larg=4.6, alt=k.A, cor=k.RGBColor(0x0D, 0x31, 0x3B))
    k.texto(s, "PRÓXIMOS PASSOS", esq=1.0, topo=0.95, larg=8, alt=0.3, tam=11, fonte=k.DADO_FONTE,
            cor=k.RGBColor(0x8F, 0xB4, 0xB2), entreletras=1.4)
    k.texto(s, [
        "Rodada com protetores locais e casos reais no mural",
        "Conta opcional, oferecida depois de publicar",
        "Medir os desfechos: quantos reencontros passaram pelo mural",
        "iPhone pela versão web instalável",
    ], esq=1.0, topo=1.35, larg=7.2, alt=2.6, tam=15.5, cor=k.RGBColor(0xB6, 0xCE, 0xCB), espaco=1.3)
    k.texto(s, "Obrigado", esq=0.95, topo=4.3, larg=8, alt=1.0, tam=50, fonte=k.TITULO_FONTE,
            cor=k.CHUVA, negrito=True)
    k.costura(s, esq=1.0, topo=5.45, larg=3.4)
    k.texto(s, "Bruna Kellen · Murilo Falcão · Rafael Nobre", esq=1.0, topo=5.85, larg=8, alt=0.4,
            tam=15, cor=k.RGBColor(0x8F, 0xB4, 0xB2))
    for x, imagem, rotulo, nota in ((8.6, qr_web, "Versão web", "qualquer celular"),
                                    (10.75, qr_apk, "APK Android", "instalar sem loja")):
        s.shapes.add_picture(str(imagem), Inches(x + 0.15), Inches(2.6), height=Inches(1.6))
        k.texto(s, rotulo, esq=x, topo=4.35, larg=1.9, alt=0.35, tam=14, cor=k.CHUVA, negrito=True,
                alinha=PP_ALIGN.CENTER)
        k.texto(s, nota, esq=x, topo=4.68, larg=1.9, alt=0.35, tam=10.5, fonte=k.DADO_FONTE,
                cor=k.RGBColor(0x6F, 0x97, 0x99), alinha=PP_ALIGN.CENTER)


def slide_capa(prs):
    s = k.novo_slide(prs, fundo=k.TAPAJOS)
    k.retangulo(s, esq=0, topo=0, larg=4.6, alt=k.A, cor=k.RGBColor(0x0D, 0x31, 0x3B))
    k.texto(s, "LABORATÓRIO DE DESENVOLVIMENTO DE SOFTWARE · UFOPA", esq=1.0, topo=1.5, larg=11,
            alt=0.3, tam=11, fonte=k.DADO_FONTE, cor=k.RGBColor(0x8F, 0xB4, 0xB2), entreletras=1.4)
    k.texto(s, "Achei um Bicho", esq=0.95, topo=1.95, larg=11, alt=1.5, tam=66,
            fonte=k.TITULO_FONTE, cor=k.CHUVA, negrito=True, espaco=0.92)
    k.texto(s, "O bicho perdido quase sempre está perto de casa", esq=1.0, topo=3.35, larg=10,
            alt=0.6, tam=22, cor=k.RGBColor(0xB6, 0xCE, 0xCB))
    k.costura(s, esq=1.0, topo=4.35, larg=3.4)
    k.texto(s, ["Desafio 2 — Causa Animal e Cultura · ODS 15 (Vida Terrestre)",
                "The Final Pitch · 21 de novembro de 2026"],
            esq=1.0, topo=4.75, larg=9, alt=1.0, tam=14, cor=k.RGBColor(0x9F, 0xBD, 0xBB), espaco=1.3)
    k.texto(s, "EQUIPE", esq=1.0, topo=5.85, larg=9, alt=0.3, tam=10, fonte=k.DADO_FONTE,
            cor=k.RGBColor(0x6F, 0x97, 0x99), entreletras=1.4)
    k.texto(s, "Bruna Kellen · Murilo Falcão · Rafael Nobre", esq=1.0, topo=6.15, larg=9, alt=0.4,
            tam=17, cor=k.RGBColor(0xB6, 0xCE, 0xCB))


def main():
    PITCH.mkdir(parents=True, exist_ok=True)
    qr_web = alpha.ALPHA / "qr-web.png"
    qr_apk = alpha.ALPHA / "qr-apk.png"

    prs = Presentation()
    prs.slide_width = Inches(k.L)
    prs.slide_height = Inches(k.A)

    slide_capa(prs)
    slide_problema(prs, 2)
    slide_entrega(prs, 3, qr_web)
    alpha.TELAS = TELAS  # o slide de tela do alpha lê desta pasta
    for i, dados in enumerate(TELAS_DECK):
        alpha.slide_tela(prs, dados, numero=4 + i)
    n = 4 + len(TELAS_DECK)
    slide_privacidade(prs, n)
    slide_arquitetura(prs, n + 1)
    alpha.slide_modelagem(prs, n + 2)
    slide_qualidade(prs, n + 3)
    slide_limites(prs, n + 4)
    slide_fecho(prs, qr_web, qr_apk)

    # sem isso o python-pptx grava o autor e a data do modelo dele
    props = prs.core_properties
    props.title = "Achei um Bicho · Pitch final"
    props.author = props.last_modified_by = "Bruna Kellen, Murilo Falcão, Rafael Nobre"
    props.comments = ""
    props.created = props.modified = datetime(2026, 11, 12, 23, 0)

    prs.save(str(SAIDA))
    print(f"{SAIDA.name}: {len(prs.slides._sldIdLst)} slides")


if __name__ == "__main__":
    main()
