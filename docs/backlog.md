# Backlog

O que ficou para depois do pitch de 21/11, em ordem de prioridade dentro de cada
bloco. As funcionalidades F1 a F9 estão prontas e listadas no README ("O que já
funciona"). Atualizado em 12/11/2026.

## Produto

- [ ] **Primeira rodada com protetores locais.** Não aconteceu até o pitch; os prazos
  de 9 e 15 dias do ciclo de vida continuam sendo chute inicial até essa conversa.
- [ ] **Conta opcional, só com e-mail** (decisão P1): quem publica sem conta e perde o
  código de edição hoje não recupera o caso (P2). A conta seria o caminho de
  recuperação, sem tirar a publicação sem cadastro.
- [ ] **Moderação de denúncias.** A denúncia é registrada e o número de reivindicações
  denunciadas aparece para o autor, mas ninguém revisa as denúncias.
- [ ] **Telefone verificado** por código enviado por SMS ou WhatsApp. Sem isso, alguém
  pode reivindicar com o número de outra pessoa e denunciar para inflar a contagem.
- [ ] **Reivindicação idempotente**, como já é a publicação: reenviar depois de perder a
  resposta cria uma segunda reivindicação.
- [ ] **Reabrir pelo lado do caso próprio.** Quando quem reabre é o autor do caso que
  entrou como "caso próprio" de uma reivindicação aceita noutro caso, só o seu lado
  volta ao mural; a reivindicação e o outro caso continuam em contato.
- [ ] **Caso próprio já cobrado e depois aceito** pode expirar durante o contato,
  porque o aceite não renova o relógio de quem não agiu.
- [ ] Reabrir um caso e aceitar outro que aponta para ele ao mesmo tempo pode dar
  deadlock no banco (hipótese da revisão, sem teste).
- [ ] Bairro preenchido sozinho a partir do ponto (geocodificação reversa, guardando o
  resultado no banco).
- [ ] Ajustar o ponto no mapa arrastando, como no protótipo.

## Aplicativo

- [ ] **iPhone pelo Expo Go com EAS Update**, aberto por QR code sem o notebook. A
  versão web instalável (manifesto, ícone e tela cheia) já está pronta.
- [ ] Ícone e tela de abertura próprios.
- [ ] APK menor: gerar só para `arm64-v8a`.

## Qualidade e esteira

- [ ] **Linter e formatter** (ESLint e Prettier) como etapa obrigatória da integração
  contínua.
- [ ] **Números de testes dos slides lidos do relatório da integração contínua**, não
  copiados à mão.
- [ ] **Carga com 20.000 casos dentro da meta**: com o mural decidindo pelo centro
  publicado, a API traz e calcula todos os casos até 5 km (p95 de 7,7 s nessa
  densidade; ver `docs/qualidade/carga.md`). Saída: calcular o deslocamento no banco
  (`pgcrypto`) ou guardar o centro publicado numa coluna com índice.
- [ ] **Margem do deslocamento presa ao raio de 300 m**: um `CHECK` em
  `raio_imprecisao_m` ou um teste que compare a constante com a coluna.
- [ ] Apagar `locaisNoRaio` em `geo.repositorio.ts`, que só os testes usam e mede pelo
  ponto real.
- [ ] Cópia de segurança agendada do banco do Neon.
