# Achei um Bicho — protótipo de média fidelidade

Mural georreferenciado de cães e gatos perdidos e encontrados em Santarém-PA.
Desafio 2 do Product Design Studio Canvas (Causa Animal e Cultura, ODS 15).

Entrega da missão de 28/08/2026: **7 telas + 2 estados**, acima do mínimo de 5 pedido.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `achei-um-bicho.html` | Fonte única do protótipo. Todo o resto é gerado a partir dele. |
| `prancheta.png` | Visão geral com as 9 telas e o painel de design, para colar no slide. |
| `telas/*.png` | Uma imagem por tela, 1170×2532 (3×), para a apresentação. |

## As telas

| # | Tela | O que ela prova |
|---|---|---|
| 01 | Casos perto de você | O raio de 1,6 km é a regra do produto, e fica visível e editável no topo. |
| 02 | Caso aberto | Avistamento e reivindicação são caminhos diferentes. Contato não é exposto. |
| 03 | Publicar — quem perdeu | Nome, quando, onde, e o sinal particular que vira prova depois. |
| 04 | Publicar — quem achou | Só campo fechado, e publicação sem conta. |
| 05 | Pistas — pode ser o mesmo bicho | Pareamento explicado por atributo, sem porcentagem de compatibilidade. |
| 06 | Confirmar que é seu | Prova por sinal particular antes de qualquer contato. |
| 07 | Meus casos | Estados do caso e caso parado que expira. |
| A | Primeiro dia, bairro sem casos | Mural vazio vira convite, não tela morta. |
| B | Publicado sem sinal | Fila local. A tela nunca mente dizendo que publicou. |

As telas 03 e 04 são os dois lados da mesma funcionalidade e existem separadas de
propósito: quem perdeu tem informação que quem achou não tem — nome, hora exata
do sumiço e o sinal particular. Quem achou tem pressa e uma mão só.

## Importar no Figma

O caminho que preserva camadas editáveis (texto continua texto, flex vira Auto Layout):

1. No Figma, instale o plugin **html.to.design** (gratuito para o uso básico).
2. Abra o plugin em um arquivo novo → aba **Code**.
3. Cole o conteúdo inteiro de `achei-um-bicho.html` e importe.
   Se o plugin pedir URL em vez de código, sirva a pasta localmente e aponte para o endereço:
   ```
   cd prototipo && python3 -m http.server 8080
   # depois use http://localhost:8080/achei-um-bicho.html no plugin
   ```
4. Cada tela chega como um grupo de 390×844. Selecione um por vez e use
   **Frame selection** (`Ctrl/Cmd + Alt + G`) para transformar em Frame de verdade.

### Fontes a instalar antes de importar

As três são gratuitas no Google Fonts. Sem elas o Figma substitui por uma fonte
padrão e o layout desloca.

- **Commissioner** — títulos (700 e 800)
- **IBM Plex Sans** — texto (400, 500, 600)
- **IBM Plex Mono** — dados: distância, hora, bairro (400, 500)

No Figma desktop basta instalá-las no sistema. No Figma web, instale o
[Figma Font Helper](https://help.figma.com/hc/en-us/articles/360039956894).

### Se preferir não usar plugin

Arraste os PNGs de `telas/` para o Figma. Vira imagem, não camada editável —
serve para apresentar, não para iterar.

## Gerar os PNGs de novo depois de editar o HTML

Cada `figure` tem um id (`tela-01` … `estado-b`). Abrir o arquivo com o id no
final do endereço isola aquele frame — é assim que a exportação funciona, sem
duplicar o markup em nove arquivos.

```bash
cd prototipo
# o Playwright troca o número da pasta a cada versão; procurar evita caminho quebrado
CHROME=$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell | tail -1)

# prancheta inteira
"$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
  --virtual-time-budget=8000 --window-size=1800,4560 \
  --screenshot=prancheta.png "file://$PWD/achei-um-bicho.html"

# uma imagem por tela
for id in tela-01 tela-02 tela-03 tela-04 tela-05 tela-06 tela-07 estado-a estado-b; do
  "$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=3 \
    --virtual-time-budget=6000 --window-size=390,844 \
    --screenshot="telas/$id.png" "file://$PWD/achei-um-bicho.html#$id"
done
```

## Sistema visual

### Paleta

| Cor | Hex | Onde entra |
|---|---|---|
| Fundo do Tapajós | `#123E4A` | Texto, navegação, superfície escura |
| Água da orla | `#2F8587` | Estado "sumiu" |
| Silte do Amazonas | `#B6AA95` | Estado "foi achado" |
| Areia de Alter | `#E2A83B` | Único acento: ação principal, pareamento e caso resolvido |
| Chuva na orla | `#EEF2EE` | Fundo |

Texto sobre o acento é sempre `#123E4A`, nunca branco.

### A assinatura: a costura

Em frente a Santarém, o Tapajós e o Amazonas correm lado a lado por quilômetros
sem se misturar. A costura empresta esse par de cores — um traço azul, um traço
silte e um losango de junção no meio — mas **só aparece onde dois registros se
relacionam**: entre as duas fotos de um pareamento, na tela de verificação e no
caso que se resolveu, quando o losango fecha em amarelo.

Ela não aparece como faixa no cabeçalho. Faixa decorativa vira cartão-postal
turístico e deixa de significar alguma coisa.

### Por que os placeholders são assim

Média fidelidade honesta: conteúdo e hierarquia são reais, acabamento não é.
Foto, mapa e avatar aparecem como campo de dado aguardando conteúdo, com marca
de corte no canto e etiqueta do que vai ali. Sem foto simulada, sem silhueta de
cachorro, sem grafismo indígena usado como papel de parede. O traço local vem
do que o sistema mede: bairro, distância, raio de 1,6 km, o rio ao norte no
mini-mapa como ele está na cidade.

## Decisões de escopo já tomadas

**Cortado de propósito:** painel de alertas com bairros seguidos e gráfico de
volume semanal. Era ajuste antes de existir conteúdo, e trazia junto notificação
em segundo plano — dívida grande demais para três pessoas até novembro. Sobrou o
raio editável no topo do mural, que é o que a pesquisa sustenta.

**Não implementar:** score de compatibilidade, ranking ou qualquer forma de
aprendizado de máquina no pareamento. O pareamento é determinístico — espécie,
porte, cor, distância e diferença de dias — e mostra o que bateu e o que não
bateu. É mais defensável na banca e é o que cabe no prazo.

## Decisões que ainda precisam do squad

- Nome definitivo do aplicativo. "Achei um Bicho" é coloquial e funciona, mas
  não foi validado com ninguém de fora da equipe.
- Como o código de edição sem conta é entregue e recuperado (link, PIN, ambos).
- Regra de expiração: 15 dias sem resposta é chute inicial, precisa de conversa
  com protetores locais.
- Quem são os dois ou três protetores parceiros que alimentam casos reais na
  primeira semana, para o mural não nascer vazio.

## Base da decisão de produto

O raio de 1,6 km não é estimativa. Vem de análise de dados de abrigo: 70% dos
cães recuperados estavam a menos de 1,6 km de casa e 42% a menos de um
quarteirão — alerta de vizinhança supera divulgação para a cidade inteira.
Identificação permanente triplica a taxa de devolução ao tutor, e o modo de
falha conhecido desses sistemas é cadastro desatualizado, o que explica o caso
parado que expira na tela 07.

Referências completas no PDF `Ideias_Projeto_LabDesSoft.pdf`, na raiz do projeto.
