# Backlog

O que falta até o pitch de 21/11, em ordem de prioridade dentro de cada bloco.
Item concluído sai daqui e vira linha no README ("O que já funciona").
Atualizado em 10/10/2026. O alpha foi adiado pela professora para 16/10.

## Alpha · 16/10 (adiado de 09/10)

Tudo da Sprint 2 está pronto: F5 (gerador de pareamentos e telas de Pistas e Meus
casos), deploy público, fotos guardadas no banco, APK do Android, dados de
demonstração em volta da Unidade Tapajós, roteiro e slides. Falta só:

- [ ] **Ensaiar o roteiro** ([alpha/roteiro.md](alpha/roteiro.md)) com o APK no
  celular, pelo menos uma vez, na véspera.

## Sprint 3 · Proteger · 10/10 a 23/10

- [ ] **F6 · Reivindicação com verificação.** Quem diz ser o tutor responde às
  três perguntas; o autor confere e aceita ou recusa. Hoje o botão "Acho que esse
  bicho é meu" só explica que a etapa vem aí.
- [ ] **F7 · Contato mediado.** Telefone liberado só depois do aceite, com teste
  automatizado de que nenhum dado de contato vaza antes (RNF4).
- [ ] **Limite de requisições na API.** Publicar e avisar não pedem conta; sem
  limite por origem, um robô enche o mural.

## Sprint 4 · Fechar o ciclo · 24/10 a 06/11

- [ ] **F8 · Editar e encerrar caso com o código de edição**, com desfecho
  obrigatório (RN9).
- [ ] **F8 · Cobrança e expiração** de caso parado (9 e 15 dias, RN8). No Render
  gratuito não há tarefa agendada: disparar por ação agendada do GitHub.
- [ ] **Recuperar o código de edição** perdido (consequência de publicar sem conta).
- [ ] **F9 · Publicação sem conexão**, com fila no aparelho. Primeira a sair se
  apertar.
- [ ] **RNF3 · Mural abre com o último conteúdo** quando não há conexão.
- [ ] **Primeira rodada com protetores locais.**

## Qualidade e esteira

- [ ] **Testes E2E com Maestro** nos caminhos críticos: publicar (os dois lados),
  mural com filtro e raio, caso aberto e avistamento. Precisa de emulador Android
  ou celular ligado ao computador.
- [ ] **Linter e formatter** (ESLint e Prettier) como etapa obrigatória da
  integração contínua, que hoje confere tipos e testes.
- [ ] **Proteger a branch `main`** no GitHub para exigir a integração contínua
  verde antes do merge.
- [ ] **Análise estática de segurança** (CodeQL, grátis para repositório público)
  e auditoria de dependências.
- [ ] **Teste de carga** da consulta do mural (k6), com o banco cheio de casos.
- [ ] **RNF2 medido:** publicar um caso com foto consome menos de 1 MB.
- [ ] **RNF5 conferido:** contraste AA de toda a paleta.

## Aplicativo

- [ ] Ícone e tela de abertura próprios (hoje são os padrões do Expo).
- [ ] Bairro preenchido sozinho a partir do ponto (geocodificação reversa,
  guardando o resultado no banco).
- [ ] Ajustar o ponto no mapa arrastando, como no protótipo.
- [ ] Campo "castrado" no formulário (o banco e a API já aceitam).

## Documentação e entrega

- [ ] Artigo SBC: rascunho completo até 15/11.
- [ ] Vídeo de reserva do sistema funcionando, para o caso de a rede falhar no pitch.
