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
- [ ] **Carga com 20.000 casos dentro da meta**: a contagem de casos até 5 km domina
  a resposta nessa densidade (p95 de 669 ms; ver `docs/qualidade/carga.md`). Uma saída
  é contar com teto ou guardar a contagem por região.
- [ ] Cópia de segurança agendada do banco do Neon.
