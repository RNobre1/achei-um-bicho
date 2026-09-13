# Funcionalidades do MVP: Achei um Bicho

**Laboratório de Desenvolvimento de Software · UFOPA · Desafio 2 (Causa Animal e Cultura, ODS 15)**
Versão 1.1, de 9 de setembro de 2026
Entrega do item 3 do checklist de 28/08/2026: *definir as principais funcionalidades do MVP*.

---

## 1. O problema, em uma frase

Em Santarém, quem perde um cão ou um gato publica em grupo de WhatsApp e no
Facebook; quem encontra faz o mesmo, em outro grupo. As duas informações existem
na mesma cidade, no mesmo dia, e não se encontram, porque não há nada que as
compare nem que avise o vizinho certo.

O concorrente real do projeto é o grupo de WhatsApp, não outro aplicativo.
Qualquer funcionalidade que não seja melhor que postar no grupo fica de fora.

## 2. A regra que organiza o produto inteiro

Análise de dados de abrigo mostra que 70% dos cães recuperados estavam a menos de
1,6 km de casa, e 42% a menos de um quarteirão. Divulgação para a cidade inteira
é ruído; alerta de vizinhança é sinal.

Consequência de projeto: o raio padrão do mural é 1,6 km, e o raio é a primeira
coisa visível na tela, e não um ajuste escondido.

Segunda evidência: identificação permanente triplica a taxa de devolução ao
tutor, mas o modo de falha conhecido desses sistemas é o cadastro desatualizado.
Consequência: caso sem movimento é cobrado e expira.

## 3. Quem usa

| Perfil | Situação | O que precisa em 30 segundos |
|---|---|---|
| **Tutor que perdeu** | Aflito, mexendo no celular na rua | Publicar rápido e ser avisado de qualquer bicho parecido perto de casa |
| **Quem encontrou** | Boa vontade, pressa, o bicho está ali na frente | Publicar **sem criar conta**, com uma mão só |
| **Protetor / ONG** | Recebe dezenas de casos por semana | Ver o que é caso novo, o que já foi resolvido, e não repetir esforço |
| **Vizinho** | Não perdeu nada, mas passa na rua todo dia | Receber pouco aviso e só do seu pedaço |

## 4. Escopo do MVP

### O que o MVP faz

| # | Funcionalidade | Prioridade | Tela |
|---|---|---|---|
| F1 | Publicar caso de bicho perdido | Obrigatória | 03 |
| F2 | Publicar caso de bicho encontrado, sem conta | Obrigatória | 04 |
| F3 | Mural por proximidade, com raio ajustável | Obrigatória | 01, Estado A |
| F4 | Caso aberto e registro de avistamento | Obrigatória | 02 |
| F5 | Pareamento determinístico entre perdidos e encontrados | Obrigatória | 05 |
| F6 | Verificação por sinal particular antes do contato | Obrigatória | 03, 06 |
| F7 | Contato mediado, liberado pelos dois lados | Obrigatória | 06, 07 |
| F8 | Ciclo de vida do caso, com desfecho e expiração | Obrigatória | 07 |
| F9 | Publicação com a conexão caída | Desejável | Estado B |

### O que o MVP não faz, e por quê

| Fora de escopo | Motivo |
|---|---|
| Score de compatibilidade, ranking ou aprendizado de máquina no pareamento | Promete inteligência que a equipe não consegue validar em três meses, e é mais difícil de defender que uma regra explicada |
| Notificação push com serviço em segundo plano | Infraestrutura desproporcional para 3 pessoas; o aviso do MVP acontece dentro do aplicativo |
| Painel de alertas com bairros seguidos e volume semanal | Ajuste de preferência antes de existir conteúdo; o raio editável no mural já entrega a mesma decisão |
| Chat interno completo | O contato mediado libera telefone/WhatsApp; construir mensageria é reconstruir o que a cidade já usa |
| Cadastro permanente de animal com QR (o "RG Animal") | É outro produto, e bom, mas não cabe junto |
| Mapa com tiles reais em todas as telas | Tile custa conexão; o MVP usa área aproximada e bairro. Mapa só onde acrescenta |

---

## 5. Funcionalidades detalhadas

### F1. Publicar caso de bicho perdido

O tutor informa espécie, porte, cor dominante, coleira, nome, foto, local
aproximado e data/hora do sumiço, e responde **três perguntas de verificação**
cuja resposta só ele conhece (sinal que não aparece na foto, nome que o animal
atende, o que ele usava).

**Critério de aceite**
- Publicação completa em até 4 passos.
- Os três atributos usados no pareamento (porte, cor, coleira) são campos de
  escolha fechada, nunca texto livre.
- As respostas de verificação são gravadas e nunca aparecem no caso público.
- O caso nasce no estado `PROCURANDO`.

### F2. Publicar caso de bicho encontrado, sem conta

Mesmo fluxo, do outro lado: quem encontrou publica sem cadastro e recebe um
código de edição. O cadastro pode ser oferecido depois, nunca antes.

**Critério de aceite**
- É possível concluir a publicação sem informar e-mail, senha ou telefone.
- O sistema devolve um código que permite editar e encerrar o caso depois.
- O caso nasce no estado `ABRIGADO_TEMPORARIAMENTE`.

### F3. Mural por proximidade, com raio ajustável

Lista dos casos abertos ordenada por distância, com filtro por situação
(tudo / sumiram / foram achados) e raio padrão de 1,6 km, ajustável.

**Critério de aceite**
- Cada item mostra distância em metros e tempo desde a publicação.
- Alterar o raio recarrega a lista sem sair da tela.
- Mural vazio mostra quantos casos existem no raio maior e oferece ampliar ou
  convidar vizinhos. Nenhum caso fictício é exibido.

### F4. Caso aberto e registro de avistamento

A tela do caso mostra foto, atributos, área aproximada e relato. Duas ações
separadas: **"Vi esse bicho na rua"** (avistamento) e **"Acho que esse bicho é
meu"** (reivindicação, que leva à F6).

**Critério de aceite**
- Telefone e endereço exato não aparecem nesta tela.
- O avistamento registra local e horário e aparece para quem publicou.
- Avistamento não exige conta.

### F5. Pareamento determinístico

Quando um caso é publicado, o sistema procura casos do lado oposto e monta uma
lista de candidatos comparando espécie, porte, cor dominante, coleira, distância
geográfica e diferença de dias.

**Critério de aceite**
- Nenhuma porcentagem, nota ou ranking opaco é exibido.
- Cada candidato mostra o que bateu e o que não bateu, incluindo o atributo que
  enfraquece o par.
- A decisão é sempre de uma pessoa: o sistema aproxima, não conclui.

### F6. Verificação por sinal particular

Antes de qualquer contato, quem reivindica responde as três perguntas cadastradas
em F1/F2. As respostas vão para quem publicou o caso, e só para essa pessoa.

**Critério de aceite**
- Não existe botão "é meu" que libere contato direto.
- O texto da tela diz explicitamente que o aplicativo não decide de quem é o
  animal.
- As respostas ficam visíveis apenas para o autor do caso.

### F7. Contato mediado

Se as respostas conferem, o autor do caso libera o contato. Só nesse momento
telefone e localização aparecem, para os dois lados.

**Critério de aceite**
- Nenhum dado de contato é exposto antes da liberação explícita.
- A liberação muda o caso para o estado `EM_CONTATO`.
- Existe caminho para denunciar comportamento suspeito.

### F8. Ciclo de vida do caso

Estados: `PROCURANDO` · `ABRIGADO_TEMPORARIAMENTE` · `EM_CONTATO` ·
`RESOLVIDO` · `EXPIRADO`. O desfecho é informado por quem publicou.

**Critério de aceite**
- Caso sem movimento por 9 dias recebe pedido de confirmação.
- Sem resposta, é retirado do mural em 15 dias e passa a `EXPIRADO`.
- Encerrar exige escolher o desfecho (voltou para casa, foi adotado, não foi
  encontrado), porque o desfecho é o dado que sustenta o artigo.

### F9. Publicação com a conexão caída

Rascunho fica salvo no aparelho, foto é reduzida, o local pode ser informado pelo
nome do bairro, e o envio acontece sozinho quando a conexão volta.

**Critério de aceite**
- A tela nunca diz "publicado" enquanto o envio não confirma.
- A fila mostra o que está esperando e o que já subiu, com horário.
- Casos já carregados continuam legíveis sem conexão.

---

## 6. Regras de negócio

| # | Regra |
|---|---|
| RN1 | Raio padrão do mural é 1,6 km, ajustável pelo usuário entre 500 m e 5 km |
| RN2 | Publicar caso de animal encontrado não exige conta |
| RN3 | Todo caso tem exatamente três perguntas de verificação, definidas por quem publica |
| RN4 | Respostas de verificação são visíveis apenas para o autor do caso |
| RN5 | Dados de contato só são expostos após liberação explícita do autor |
| RN6 | Pareamento compara apenas atributos declarados; nenhuma inferência automática |
| RN7 | Candidato a pareamento exige, no mínimo, mesma espécie e menos de 5 km |
| RN8 | Caso sem interação por 9 dias entra em cobrança; por 15 dias, expira |
| RN9 | Encerramento exige desfecho declarado |
| RN10 | Localização é sempre publicada como área aproximada, nunca endereço exato |

## 7. Requisitos não funcionais

| # | Requisito | Como se verifica |
|---|---|---|
| RNF1 | Funciona em Android de entrada, com pouca memória | Teste em aparelho real do squad, não só em emulador |
| RNF2 | Publicar um caso consome menos de 1 MB de dados | Medição no envio, com a foto já reduzida |
| RNF3 | Mural abre com conteúdo em cache quando não há conexão | Teste com modo avião |
| RNF4 | Nenhum dado pessoal aparece antes da liberação | Teste automatizado sobre a resposta da API |
| RNF5 | Texto legível ao sol, contraste mínimo AA | Verificação de contraste na paleta |

## 8. Rastreabilidade: funcionalidade × tela do protótipo

| Tela | Arquivo | Funcionalidades |
|---|---|---|
| 01 Casos perto de você | `prototipo/telas/tela-01.png` | F3 |
| 02 Caso aberto | `tela-02.png` | F4 |
| 03 Publicar — quem perdeu | `tela-03.png` | F1, F6 (cadastro das perguntas) |
| 04 Publicar — quem achou | `tela-04.png` | F2 |
| 05 Pistas | `tela-05.png` | F5 |
| 06 Confirmar que é seu | `tela-06.png` | F6, F7 |
| 07 Meus casos | `tela-07.png` | F8 |
| Estado A — bairro sem casos | `estado-a.png` | F3 |
| Estado B — publicado sem sinal | `estado-b.png` | F9 |

## 9. Entidades principais (rascunho para a UML)

Índice das entidades. O modelo completo, com esquema físico e índices, está em
`modelo-er.md`.

- **Pessoa**: pode existir sem conta, identificada por código de edição
- **Caso**: tipo (perdido/encontrado), estado, datas, autor
- **Animal**: espécie, porte, cor dominante, coleira, nome, sinais
- **Foto**: vinculada ao animal
- **Local**: ponto aproximado, bairro, raio de imprecisão
- **Avistamento**: quem viu, onde, quando, vinculado a um caso
- **PerguntaVerificacao / RespostaVerificacao**: três por caso
- **Pareamento**: dois casos, lista de atributos que bateram e que não bateram, veredito humano
- **Desfecho**: tipo e data, obrigatório no encerramento

## 10. O caminho até o pitch

| Data | Entrega |
|---|---|
| 28/08/2026 | Squad, desafio, este documento e as telas de média fidelidade |
| Setembro | UML (casos de uso, classes, estado, sequência) e modelo de dados |
| 09/10/2026 | **Alpha**: F1 a F5 rodando com dados reais do squad |
| Outubro | F6 a F8, testes e primeira rodada com protetores locais |
| 21/11/2026 | **Pitch final**: sistema rodando, artigo SBC, código e documentação |

**Ordem de construção sugerida:** F1 → F3 → F2 → F4 → F5 → F8 → F6 → F7 → F9.
Se o prazo apertar, F9 é a primeira a sair, e é a única que pode sair sem
quebrar a história do produto.

## 11. Roteiro de 60 segundos para o pitch

A demonstração acontece na tela do caso, não no mural.

1. Uma moradora do Aparecida encontra um cachorro. Toca "Achei um bicho", publica
   sem conta e recebe um código. A conexão cai; o caso fica salvo e sobe sozinho.
2. Esta é a tela do caso: foto, porte, cor, hora e bairro no mesmo lugar. O mapa
   mostra área aproximada, não o endereço de ninguém.
3. Abaixo, o sistema não inventa porcentagem. Ele mostra por que existe uma
   pista: mesmo porte, mesma cor, 850 metros, um dia de diferença.
4. Quem reconhece não toca "é meu". Toca "acho que esse bicho é meu" e responde
   sinais que não foram publicados.
5. O autor decide abrir o contato. Só aí telefone e local aparecem, para os dois.
6. Depois do reencontro, o desfecho é informado e o anúncio sai do mural.

O que isso transforma: um disparo amplo de WhatsApp vira triagem de bairro,
contato mais seguro e encerramento verificável.

---

## 12. O que ainda precisa ser decidido

- Nome definitivo do aplicativo: "Achei um Bicho" ainda não foi testado fora da equipe.
- Formato do código de edição sem conta: link, PIN ou os dois.
- Os prazos de 9 e 15 dias são chute inicial; precisam de conversa com protetores locais.
- Quais dois ou três protetores alimentam casos reais na primeira semana, para o
  mural não nascer vazio.
