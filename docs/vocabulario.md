# Vocabulário fechado

<!-- Gerado a partir de packages/contratos/src/vocabulario.ts.
     Não edite à mão: rode `pnpm --filter @achei/contratos gerar:docs`. -->

Valores aceitos em cada campo de escolha fechada do sistema. O mesmo conjunto vale
para a API, para as restrições do banco e para os chips das telas.

## Espécie do animal (`especie`)

| Valor | Rótulo | Por quê |
|---|---|---|
| `cachorro` | Cachorro | A maior parte dos casos nos grupos da cidade é de cachorro. |
| `gato` | Gato | Gato some com frequência e quase nunca volta sozinho para casa. |

## Porte do animal (`porte`)

| Valor | Rótulo | Por quê |
|---|---|---|
| `pequeno` | Pequeno | Três faixas é o que dá para dizer de longe, sem medir o animal. |
| `medio` | Médio | Faixa do vira-lata típico, que é a maioria dos casos em Santarém. |
| `grande` | Grande | Separa os animais que quem encontra costuma ter receio de abordar. |

## Cor que mais aparece no animal (`cor`)

| Valor | Rótulo | Por quê |
|---|---|---|
| `caramelo` | Caramelo | É a cor mais comum entre os vira-latas da região. |
| `preto` | Preto | Cor dominante fácil de reconhecer a distância, inclusive à noite. |
| `branco` | Branco | Cor dominante fácil de reconhecer, mesmo com manchas pequenas. |
| `malhado` | Malhado | Cobre os animais de duas ou mais cores sem obrigar a descrever cada uma. |
| `cinza` | Cinza | Aparece bastante em gatos e não se confunde com preto nem branco. |

## Situação da coleira (`coleira`)

| Valor | Rótulo | Por quê |
|---|---|---|
| `com` | Com coleira | Coleira indica que o animal tem casa e ajuda a separar perdido de abandonado. |
| `sem` | Sem coleira | Informação útil para o pareamento, porque coleira pode cair ou ser tirada. |
| `nao_observado` | Não deu para ver | Quem viu de longe não deve ser obrigado a inventar uma resposta. |

## Lado do caso (`tipoCaso`)

| Valor | Rótulo | Por quê |
|---|---|---|
| `perdido` | Sumiu | Publicado por quem perdeu o animal e está procurando. |
| `encontrado` | Foi achado | Publicado por quem encontrou um animal na rua e quer devolver. |

## Ciclo de vida do caso (`estadoCaso`)

| Valor | Rótulo | Por quê |
|---|---|---|
| `procurando` | Procurando | Estado inicial de quem perdeu: o caso aparece no mural e recebe pistas. |
| `abrigado_temporariamente` | Abrigado por alguém | Estado inicial de quem achou: o animal está seguro, esperando o tutor. |
| `em_contato` | Em contato | As duas partes já se falaram depois da verificação; o caso sai do alcance público. |
| `resolvido` | Resolvido | O autor informou o desfecho e o caso deixa de aparecer no mural. |
| `expirado` | Expirado | Caso sem interação sai do mural sozinho para não virar anúncio morto. |

## Como o caso terminou (`tipoDesfecho`)

| Valor | Rótulo | Por quê |
|---|---|---|
| `voltou_para_casa` | Voltou para casa | É o resultado que o produto existe para produzir, e o que o artigo mede. |
| `foi_adotado` | Foi adotado | Quando o tutor não aparece, quem acolheu pode ficar com o animal. |
| `nao_encontrado` | Não foi encontrado | Registrar o fracasso também é dado: sem ele, a taxa de sucesso mente. |

## Decisão sobre uma reivindicação (`vereditoVerificacao`)

| Valor | Rótulo | Por quê |
|---|---|---|
| `pendente` | Aguardando resposta | A pessoa respondeu as perguntas e o autor do caso ainda não conferiu. |
| `aceita` | Aceita | O autor conferiu as respostas e liberou o contato entre as partes. |
| `recusada` | Recusada | As respostas não bateram; o contato continua fechado. |

## Decisão sobre uma pista (`vereditoPareamento`)

| Valor | Rótulo | Por quê |
|---|---|---|
| `pendente` | Pode ser ele | O sistema aproximou dois casos e ninguém decidiu ainda. |
| `confirmado` | É o mesmo bicho | Uma pessoa confirmou; o sistema nunca confirma sozinho. |
| `descartado` | Não é | Descartar evita que a mesma pista errada volte a aparecer. |
