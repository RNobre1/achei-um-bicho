# Documento de Visão: Achei um Bicho

**Disciplina:** Laboratório de Desenvolvimento de Software · UFOPA
**Professora:** Carla Marina C. Paxiúba
**Equipe:** Bruna Kellen · Murilo Falcão · Rafael Nobre
**Desafio:** 2, Causa Animal e Cultura · ODS 15 (Vida Terrestre)
**Versão:** 1.0, de 9 de setembro de 2026

---

## 1. Introdução

### 1.1 Propósito

Este documento define a visão do produto **Achei um Bicho**: o problema que ele
resolve, para quem, com quais características e sob quais restrições. Ele é a
referência de escopo para os artefatos seguintes: modelo de dados, diagramas
UML, tickets de implementação e artigo final.

Não é documento de arquitetura nem de requisitos detalhados. Os requisitos com
critério de aceite e o modelo de dados são tratados em documentos próprios,
listados nas referências.

### 1.2 Escopo

O produto é um aplicativo móvel que aproxima duas informações que hoje circulam
separadas na cidade de Santarém-PA: "meu cão sumiu" e "achei um cão na rua". O
sistema compara casos publicados de lados opostos, avisa quem está perto e media
o contato entre as partes com verificação de identidade do animal.

Fora do escopo do produto: adoção de animais sem tutor conhecido, denúncia de
maus-tratos, agendamento de castração, registro permanente de animais e serviços
veterinários. São problemas legítimos e vizinhos, mas não são este produto.

### 1.3 Definições

| Termo | Significado neste projeto |
|---|---|
| Caso | Uma publicação. Tem um lado: perdido ou encontrado |
| Autor do caso | Quem publicou. Não necessariamente o tutor |
| Avistamento | Registro de quem viu o animal na rua, sem estar com ele |
| Pareamento | Par de casos de lados opostos que o sistema considera candidatos |
| Verificação | Conjunto de três perguntas cuja resposta prova convívio com o animal |
| Reivindicação | Ato de dizer "esse animal é meu", que dispara a verificação |
| Desfecho | Como o caso terminou: voltou para casa, foi adotado, não encontrado |
| Raio | Distância a partir do usuário dentro da qual o mural mostra casos |

### 1.4 Referências

Documentos do projeto:

1. Funcionalidades do MVP: requisitos, regras de negócio e critérios de aceite.
2. Modelo entidade-relacionamento: entidades, esquema físico e índices.
3. Cronograma do projeto: sprints e marcos até 21 de novembro de 2026.
4. Protótipo de média fidelidade: sete telas e dois estados.

Bibliografia que sustenta as decisões de produto:

5. KREMER, T. A New Web-Based Tool for RTO-Focused Animal Shelter Data Analysis.
   *Frontiers in Veterinary Science*, 2021. Dados do abrigo público de Dallas,
   2019.
6. FATJÓ, J. et al. Epidemiology of Dog and Cat Abandonment in Spain
   (2008–2013). *Animals*, v. 5, n. 2, 2015.
7. LORD, L. et al. Characterization of animals with microchips entering animal
   shelters. *Journal of the American Veterinary Medical Association*, v. 235,
   n. 2, 2009.

---

## 2. Posicionamento

### 2.1 O problema

> Em Santarém, quem perde um cão publica num grupo de WhatsApp. Quem encontra
> publica em outro. As duas mensagens são do mesmo dia, da mesma cidade, às vezes
> do mesmo bairro, e ninguém as compara.

O problema de animais domésticos perdidos não voltarem para casa afeta os
tutores, quem encontra o animal na rua, os protetores independentes e as ONGs da
cidade. O impacto aparece em três frentes: o animal na rua fica exposto a
atropelamento, fome, doença e ao abandono definitivo; o tutor procura sem ter
onde procurar; e quem acolhe por conta própria acumula animais além do que
consegue sustentar.

Uma boa solução compararia automaticamente o que foi perdido com o que foi
encontrado, avisaria quem está por perto e mediaria o contato entre as duas
partes com segurança.

### 2.2 Declaração de posição do produto

Para os moradores de Santarém-PA que perderam ou encontraram um cão ou gato, e
que hoje dependem de grupos de WhatsApp e Facebook, onde a informação se perde no
volume e nunca é comparada, o Achei um Bicho é um mural georreferenciado de casos
de animais perdidos e encontrados. Ele compara os atributos declarados e a
distância entre os casos, avisa a vizinhança e media o contato com verificação
por sinal particular.

Diferente de postar em grupo de WhatsApp, ou de usar um aplicativo genérico de
adoção, o produto encontra o par entre as duas pontas em vez de apenas divulgar,
e protege a entrega do animal com prova, não com confiança cega.

### 2.3 O concorrente real

Quem monta um produto assim costuma olhar para os aplicativos parecidos. O
concorrente de verdade é o grupo de WhatsApp: já está instalado, já tem as
pessoas dentro e não custa nada. Funcionalidade que não seja melhor que postar
no grupo, portanto, não entra no produto.

O que o grupo de WhatsApp faz mal, e é onde este produto ganha:

| Grupo de WhatsApp | Achei um Bicho |
|---|---|
| A mensagem desce e some | O caso fica no mural até ser resolvido ou expirar |
| Ninguém compara "perdi" com "achei" | O sistema compara e mostra o par |
| Todo mundo recebe tudo | Só quem está no raio recebe |
| Telefone exposto para o grupo inteiro | Contato liberado por decisão do autor |
| Não existe encerramento | Desfecho registrado, e caso parado expira |
| Não gera dado nenhum | Gera série sobre reencontros na cidade |

---

## 3. Envolvidos e usuários

### 3.1 Envolvidos

| Envolvido | Interesse |
|---|---|
| Tutores de cães e gatos em Santarém | Recuperar o animal rapidamente |
| Quem encontra um animal na rua | Devolver sem se comprometer e sem gastar tempo |
| Protetores independentes e ONGs locais | Reduzir volume de acolhimento e organizar demanda |
| Equipe de desenvolvimento | Entregar sistema funcionando e artigo até 21/11/2026 |

### 3.2 Perfis de usuário

**Tutor que perdeu o animal.** Está aflito, mexendo no celular na rua enquanto
procura. Precisa publicar em menos de dois minutos e ser avisado de qualquer
animal parecido que apareça perto de casa. Tolerância a formulário longo: baixa.

**Quem encontrou o animal.** Está com pressa, muitas vezes segurando o animal
com uma mão e o celular com a outra. Boa vontade alta, disposição para se
cadastrar: nenhuma. Se o aplicativo exigir conta, ele fecha e posta no grupo.

**Protetor ou ONG.** Recebe dezenas de casos por semana, muitos repetidos.
Precisa distinguir caso novo de caso já resolvido e não gastar deslocamento à
toa.

**Vizinho.** Não perdeu nada. Passa pela rua todo dia e pode reconhecer o
animal. Aceita receber aviso desde que seja pouco e do seu pedaço. Três avisos
irrelevantes e ele desinstala.

### 3.3 Ambiente do usuário

- Celular Android de entrada é o aparelho típico; memória e armazenamento curtos.
- Conexão instável fora do centro urbano, e cara; consumo de dados importa.
- O uso acontece na rua, com uma mão, sob sol forte. Contraste e alvo de toque
  grandes não são refinamento, são requisito.
- A referência mental de "publicar um caso" é a mensagem de WhatsApp. Qualquer
  fluxo mais longo que isso perde a comparação.

---

## 4. Visão geral do produto

### 4.1 Perspectiva

Sistema novo, sem integração obrigatória com sistemas existentes. Compõe-se de
aplicativo móvel, API e banco de dados geoespacial. Consome serviços externos de
mapa e geocodificação, ambos substituíveis.

### 4.2 Capacidades principais

Qualquer pessoa publica um caso, com ou sem conta, e o mural mostra o que está
por perto em vez de despejar a cidade inteira. Quem viu o animal na rua registra
o avistamento sem se comprometer com nada. O sistema aproxima casos dos dois
lados e explica por que aproximou, em vez de devolver uma porcentagem que
ninguém sabe conferir.

Do outro lado da conversa, quem reivindica o animal prova antes de falar com
alguém, o contato só abre quando o autor do caso libera, e todo caso termina com
um desfecho declarado, o que impede o mural de virar depósito de anúncio morto.
A publicação funciona mesmo com a conexão caída.

A seção 5 lista essas capacidades uma a uma, com prioridade.

### 4.3 Suposições e dependências

- Existe massa suficiente de casos na cidade para o pareamento fazer sentido.
  **Risco assumido:** a primeira semana depende de dois ou três protetores locais
  alimentando casos reais.
- Usuários aceitam informar localização aproximada. Se recusarem em massa, o
  produto perde a função central.
- O raio de 1,6 km vem de estudo norte-americano (referência 5) e ainda precisa
  de validação local em Santarém.
- Serviço de tiles e geocodificação reversa gratuitos continuam disponíveis nos
  limites de uso do projeto.

---

## 5. Características do produto

O detalhamento de cada característica, com critério de aceite e prioridade,
está no documento de funcionalidades do MVP.

| # | Característica | Prioridade |
|---|---|---|
| F1 | Publicar caso de bicho perdido | Obrigatória |
| F2 | Publicar caso de bicho encontrado, sem conta | Obrigatória |
| F3 | Mural por proximidade, com raio ajustável | Obrigatória |
| F4 | Caso aberto e registro de avistamento | Obrigatória |
| F5 | Pareamento determinístico | Obrigatória |
| F6 | Verificação por sinal particular | Obrigatória |
| F7 | Contato mediado | Obrigatória |
| F8 | Ciclo de vida do caso, com desfecho e expiração | Obrigatória |
| F9 | Publicação com a conexão caída | Desejável |

### 5.1 O que foi deliberadamente cortado

| Cortado | Motivo |
|---|---|
| Score de compatibilidade, ranking, aprendizado de máquina | Regra explicada é mais defensável que porcentagem opaca, e cabe no prazo |
| Chat interno completo | O contato mediado libera o WhatsApp; não vamos reconstruir o que a cidade já usa |
| Cadastro permanente de animal com QR na coleira | É outro produto, e bom, mas não cabe junto deste |

---

## 6. Restrições

| Tipo | Restrição |
|---|---|
| Prazo | Alpha em 09/10/2026, versão final em 21/11/2026. Entrega fora do prazo vale zero |
| Equipe | Três pessoas, em regime parcial, sem dedicação exclusiva |
| Acadêmica | Exige POO explícita, modelagem UML (casos de uso, classes, estado, sequência), banco modelado e artigo em formato SBC |
| Versionamento | Repositório online obrigatório, entregas versionadas |
| Técnica | React Native com Expo no aplicativo, NestJS na API e PostgreSQL 16 com a extensão PostGIS no banco |
| Legal | Localização de residência e dados de contato são dados pessoais; a publicação usa sempre área aproximada |

---

## 7. Requisitos de qualidade

| # | Requisito | Verificação |
|---|---|---|
| RNF1 | Funciona em Android de entrada | Teste em aparelho real da equipe, não só emulador |
| RNF2 | Publicar um caso consome menos de 1 MB | Medição do envio com a foto já reduzida |
| RNF3 | Mural abre com conteúdo em cache sem conexão | Teste em modo avião |
| RNF4 | Nenhum dado pessoal exposto antes da liberação | Teste automatizado sobre a resposta da API |
| RNF5 | Contraste mínimo AA e alvos de toque grandes | Verificação de contraste na paleta e no protótipo |
| RNF6 | Consulta do mural responde em menos de 500 ms com 10 mil casos | Teste de carga contra o banco com índice espacial |

---

## 8. Critérios de sucesso

O produto é considerado bem-sucedido em 21/11/2026 se:

1. For possível publicar um caso dos dois lados, ver o mural por proximidade,
   receber um pareamento, passar pela verificação e encerrar com desfecho, tudo
   em sistema rodando, com dados reais.
2. Pelo menos um protetor local tiver usado e dado retorno registrado.
3. A documentação (UML, modelo de dados, este documento) descrever o sistema que
   de fato existe, sem divergência.
4. O artigo em formato SBC estiver escrito com dado do próprio projeto, não só
   revisão bibliográfica.

**O que não é critério de sucesso:** número de usuários. O prazo não permite
adoção real, e prometer isso na apresentação enfraquece o trabalho em vez de
fortalecer.

