# Backlog

O que falta até o pitch de 21/11, em ordem de prioridade dentro de cada bloco.
Item concluído sai daqui e vira linha no README ("O que já funciona").
Atualizado em 30/09/2026.

## Sprint 2 · Aproximar · 03/10 a 08/10 (fecha o alpha de 09/10)

- [ ] **F5 · Gerador de pareamentos determinístico.** Ao publicar ou editar um
  caso, procurar candidatos do lado oposto: mesma espécie e menos de 5 km (RN7).
  Guardar o que bateu e o que não bateu (porte, cor, coleira, distância, dias).
- [ ] **F5 · Tela de pistas.** O que bateu e o que não bateu, com "Pode ser ele" e
  "Não é". Nenhuma porcentagem.
- [ ] **Deploy público** conforme [hospedagem.md](hospedagem.md): banco no Neon,
  API e versão web no Render.
- [ ] **Fotos em armazenamento de objeto** (Supabase Storage, compatível com S3).
  Sem isso as fotos somem a cada reinício da API no Render. A troca fica toda na
  classe `ArmazenamentoDeFotos`.
- [ ] **APK do alpha** conforme [guia-apk.md](guia-apk.md), instalado em pelo menos
  um celular da equipe (RNF1).
- [ ] **Roteiro do alpha ensaiado**, com os casos de demonstração no ar.

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
- [ ] **Integração contínua no GitHub Actions**: lint, testes de unidade e de
  integração (com PostGIS como serviço do job), build da API e export web.
  Bloquear merge com teste vermelho.
- [ ] **Linter e formatter** (ESLint e Prettier) como etapa obrigatória, antes da
  integração contínua.
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

- [ ] Diagramas UML de estado (ciclo do caso) e de sequência (publicar e parear).
- [ ] Artigo SBC: rascunho completo até 15/11.
- [ ] Vídeo de reserva do sistema funcionando, para o caso de a rede falhar no pitch.
