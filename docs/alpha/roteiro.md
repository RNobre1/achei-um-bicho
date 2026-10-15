# Roteiro do alpha · 16/10/2026

Apresentação na Unidade Tapajós da UFOPA. Slides em
`Achei_um_Bicho_Alpha.pdf` (fonte: `docs/gerar-slides-alpha.py`). O ponto alto é
a demonstração ao vivo no celular: publicar um caso perdido e ver o aplicativo
mostrar, na hora, quem pode ser o mesmo bicho.

## Na véspera

- [x] Banco de produção semeado de novo em 15/10, com os oito casos de
  demonstração e as fotos. Os horários dos casos contam a partir da hora em que se
  semeia, por isso o banco se semeia na véspera ou no dia, nunca uma semana antes:
  achado mais de um dia antes do sumiço não bate no tempo. Para refazer, apagar os
  casos e rodar `API_URL=$API_URL_PRODUCAO pnpm --filter @achei/api semear:demo`
  (chaves em `.env.contas`).
- [ ] APK 0.1.5 instalado no celular da demonstração. As versões anteriores mostram
  o mapa bloqueado, não enviam foto, não mostram a sua foto nas pistas, não abrem
  a área no Google Maps ou abrem o mural no centro da cidade por demora do GPS.
- [ ] Na galeria do celular, a foto do cachorro caramelo que vai no caso ao vivo
  (pasta *AcheiTeste*). É o mesmo cachorro da pista forte, fotografado de outro
  ângulo: na tela de pistas, as duas fotos lado a lado convencem mais que a lista.

## Antes de começar (10 minutos antes)

- [ ] Abrir <https://achei-um-bicho.onrender.com> no notebook e esperar o mural
  carregar. A API gratuita dorme depois de 15 minutos parada e leva cerca de um
  minuto para acordar; acordar antes evita a tela girando na frente da turma.
- [ ] No celular Android, abrir o aplicativo instalado pelo APK (link e passo a
  passo em [../guia-apk.md](../guia-apk.md)) e confirmar que o mural mostra os
  casos perto do campus (o título diz "perto de você").
- [ ] Localização do celular ligada e permitida para o aplicativo.
- [ ] Internet no celular: Wi-Fi da sala ou dados móveis de reserva.
- [ ] Espelhar a tela do celular no projetor, se a sala permitir; se não, mostrar
  pela versão web no notebook, que é o mesmo aplicativo.

## A fala (cerca de 8 minutos)

| Tempo | Slide | O que dizer e fazer |
|---|---|---|
| 0:00 | 1 · Capa | Quem somos e o desafio: causa animal, ODS 15. |
| 0:30 | 2 · Onde estamos | Cinco das nove funcionalidades prontas e no ar. Quem quiser acompanha pelo QR code. |
| 1:00 | 3 · Casos perto | **No celular:** abrir o mural. Mostrar o raio de 1,6 km, os filtros e o botão Aumentar. |
| 2:00 | 4 · Publicar | **No celular, ao vivo:** "Meu bicho sumiu" → foto da galeria (pasta *AcheiTeste*) → cachorro, porte médio, caramelo, com coleira, um nome qualquer → localização atual, ontem à tarde → três respostas e um nome → Publicar. Mostrar o código de edição. |
| 4:00 | 6 · Pode ser o mesmo bicho | **No celular:** aba Pistas. Três casos de quem achou aparecem. Ler o primeiro: o que bateu e o que não bateu. Destacar que não há nota nem porcentagem, e que o par que bate em tudo vem antes do mais perto. Tocar em "Não é" no último. |
| 5:30 | 5 · Caso aberto | **No celular:** tocar em "Pode ser ele" no primeiro par e mostrar o caso aberto: área aproximada, nunca o endereço. Tocar no mapa abre o Google Maps na região, sem pino. Tocar em "Vi esse bicho na rua" para mostrar o aviso sem conta. |
| 6:30 | 7 · Por dentro | Três peças grátis. A consulta por raio no banco com índice espacial, e a privacidade por construção. |
| 7:00 | 8 e 9 · Modelagem e qualidade | UML gerada do código; testes escritos antes, rodando contra o banco de verdade. |
| 7:30 | 10 · Próximos passos | Verificação por sinal particular, contato mediado, ciclo de vida, protetores locais. Agradecer. |

## O que a demonstração mostra, e por quê

Os casos de demonstração estão em volta do campus, cada um com foto (domínio
público, origem em `apps/api/scripts/fotos-demo/`). Quem publica, do campus, um
cachorro caramelo de porte médio com coleira que sumiu ontem à tarde recebe três
pistas. O teste `casos-de-demonstracao.spec.ts` confere que é isso que sai:

| Caso de quem achou | Onde | O que acontece na tela |
|---|---|---|
| Caramelo com coleira | Aeroporto Velho, ~1,2 km | Bate em tudo; aparece primeiro, com o botão amarelo |
| Caramelo sem coleira | Salé, ~700 m | Mais perto, mas a coleira não confere; aparece em segundo |
| Malhado | Liberdade, ~3,4 km | Cor e distância contra; aparece por último, com o botão fraco |

## Se algo der errado

| Problema | O que fazer |
|---|---|
| Mural girando por muito tempo | A API está acordando. Seguir para o slide seguinte e voltar em um minuto. |
| Sem internet no celular | Apresentar pela versão web no notebook. |
| GPS sem sinal dentro da sala | O mural abre no centro da cidade e avisa; para publicar, ir até a janela ou usar a versão web no notebook. |
| Tudo fora do ar | Os slides 3 a 6 têm as telas reais capturadas da versão no ar. |

## Depois da apresentação

O caso publicado ao vivo fica no mural. Para tirar, quem publicou pode guardar o
código de edição; o encerramento de caso entra com a F8.
