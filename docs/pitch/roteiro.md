# Roteiro do pitch final · 21/11/2026

Slides em `Achei_um_Bicho_Pitch_Final.pdf` (fonte: `docs/gerar-slides-pitch.py`).
Artigo em `Achei_um_Bicho_Artigo_SBC.pdf` (fonte: `docs/artigo/`). Vídeo de reserva
em `docs/pitch/demonstracao.mp4` (1min43, sem som), também na release `v0.2.0` do
GitHub.

A demonstração usa dois aparelhos, porque o produto tem dois lados:

- **Celular** (APK 0.2.0): quem perdeu o cachorro.
- **Notebook** (versão web, <https://achei-um-bicho.onrender.com>): quem achou.

## Na véspera

- [ ] Ressemear o banco de produção com os casos de demonstração (os horários contam
  a partir da hora em que se semeia). Apagar os casos antigos e rodar
  `API_URL=$API_URL_PRODUCAO pnpm --filter @achei/api semear:demo` (chaves em
  `.env.contas`). Depois, abrir a aba Pistas uma vez: a distância entre os casos é
  medida entre as áreas publicadas e muda a cada semeadura.
- [ ] APK 0.2.0 instalado no celular da demonstração (link e QR em
  [../guia-apk.md](../guia-apk.md)).
- [ ] Na galeria do celular, a foto do cachorro caramelo (pasta *AcheiTeste*).
- [ ] No notebook, o navegador com a localização permitida para o site.

## Antes de começar (10 minutos antes)

- [ ] Abrir a versão web no notebook e esperar o mural carregar. A API gratuita
  dorme depois de 15 minutos e leva cerca de um minuto para acordar.
- [ ] No celular, abrir o aplicativo e conferir que o mural mostra os casos perto
  do campus ("perto de você").
- [ ] Localização ligada no celular; internet no celular e no notebook.
- [ ] Espelhar a tela do celular no projetor, se a sala permitir.

## A fala (cerca de 10 minutos)

| Tempo | Slide | O que dizer e fazer |
|---|---|---|
| 0:00 | 1 · Capa | Quem somos; desafio 2, causa animal, ODS 15. |
| 0:30 | 2 · O problema | Em Santarém, "sumiu" e "achei" circulam em grupos de WhatsApp diferentes e ninguém compara. 70% dos cães recuperados estavam a menos de 1,6 km de casa. |
| 1:15 | 3 · Entrega | As nove funcionalidades do MVP no ar. QR code para a turma acompanhar. |
| 1:45 | 4 · Perto de casa | **Celular:** abrir o mural, mostrar o raio de 1,6 km e os filtros. **Ao vivo:** "Meu bicho sumiu" → foto da galeria → cachorro, médio, caramelo, com coleira → localização atual, ontem à tarde → três perguntas → Publicar. Mostrar o código de edição e o botão de compartilhar. Aba **Pistas**: o que bateu e o que não bateu, sem nota. |
| 4:00 | 5 · Prova antes de falar | **Notebook:** abrir o caso publicado agora e tocar em "Acho que achei esse bicho". Responder às três perguntas, informar nome, telefone e onde o bicho está. Mostrar o código de acompanhamento. **Celular:** Meus casos avisa "1 pessoa respondeu às perguntas". Abrir o caso: respostas lado a lado com as esperadas. |
| 5:30 | 6 · Contato só depois do aceite | **Celular:** Aceitar. **Notebook:** atualizar a situação: agora aparecem nome e telefone do tutor, com o aviso para não pagar e marcar em lugar público. Antes do aceite, nenhum telefone aparecia. |
| 6:30 | 7 · Sem sinal | **Celular:** ligar o modo avião, publicar um caso encontrado. A tela diz "Guardado no celular", não "publicado". Tocar em "Ver fila de envio" e, com a fila aberta, desligar o modo avião: em poucos segundos o caso passa para "Publicado". |
| 7:30 | 8 · Privacidade | Área em vez de endereço, calculada com segredo; contato mediado; foto sem coordenada; caso encerrado sai do ar em 30 dias. A revisão independente achou um vazamento de posição pelas distâncias do mural, consertado. |
| 8:15 | 9 e 10 · Por dentro e modelagem | Três serviços gratuitos. PostGIS com índice espacial. UML gerada do código. |
| 8:45 | 11 · Qualidade | 648 testes escritos antes do código, 6 testes de ponta a ponta no navegador, carga medida. |
| 9:15 | 12 · O que ainda não sabemos | A rodada com protetores não aconteceu: não temos número de reencontros. |
| 9:45 | 13 · Fecho | **Celular:** encerrar o caso ao vivo com "voltou para casa"; ele sai do mural. Agradecer. |

## Se algo der errado

| Problema | O que fazer |
|---|---|
| Mural girando por muito tempo | A API está acordando. Seguir para o slide seguinte e voltar em um minuto. |
| Sem internet | Passar o vídeo de reserva, que está no notebook (`docs/pitch/demonstracao.mp4`). |
| GPS sem sinal dentro da sala | O mural abre no centro da cidade; para publicar, ir até a janela ou publicar pelo notebook. |
| Limite de requisições (muitas pessoas no mesmo Wi-Fi) | A fila do celular espera um minuto e tenta de novo sozinha. Seguir a fala. |
| Tudo fora do ar | Os slides 4 a 7 têm as telas reais capturadas da versão no ar. |

## Depois da apresentação

Encerrar no celular os casos publicados ao vivo que sobrarem, com o código de
edição guardado no aparelho.
