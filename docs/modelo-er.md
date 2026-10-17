# Modelo Entidade-Relacionamento: Achei um Bicho

**Equipe:** Bruna Kellen · Murilo Falcão · Rafael Nobre
**Versão:** 1.0, de 9 de setembro de 2026
**Banco:** PostgreSQL 16 + PostGIS

O diagrama acompanha este documento em imagem e em versão editável para
ferramenta de modelagem.

---

## 1. Diagrama

```mermaid
erDiagram
    PESSOA ||--o{ CASO : "publica"
    PESSOA ||--o{ AVISTAMENTO : "registra"
    PESSOA ||--o{ TENTATIVA_VERIFICACAO : "reivindica"

    CASO ||--|| ANIMAL : "descreve"
    CASO ||--|| LOCAL : "aconteceu em"
    CASO ||--o{ AVISTAMENTO : "recebe"
    CASO ||--|{ PERGUNTA_VERIFICACAO : "define 3"
    CASO ||--o{ TENTATIVA_VERIFICACAO : "recebe"
    CASO ||--o| DESFECHO : "termina com"
    CASO ||--o{ PAREAMENTO : "lado perdido"
    CASO ||--o{ PAREAMENTO : "lado encontrado"
    CASO ||--o{ DENUNCIA : "recebe"
    CASO |o--o{ TENTATIVA_VERIFICACAO : "é o caso próprio de quem reivindica"

    ANIMAL ||--o{ FOTO : "tem"
    LOCAL ||--o{ AVISTAMENTO : "localiza"

    TENTATIVA_VERIFICACAO ||--|{ RESPOSTA_VERIFICACAO : "contém"
    TENTATIVA_VERIFICACAO |o--o{ DENUNCIA : "motiva"
    PERGUNTA_VERIFICACAO ||--o{ RESPOSTA_VERIFICACAO : "é respondida por"

    PESSOA {
        uuid id PK
        text nome
        text telefone "nulo quando sem conta"
        text email UK "nulo quando sem conta"
        text senha_hash "nulo quando sem conta"
        timestamptz criado_em
    }

    CASO {
        uuid id PK
        text tipo "perdido | encontrado"
        text estado "procurando | abrigado_temporariamente | em_contato | resolvido | expirado"
        uuid autor_id FK
        uuid animal_id FK "um caso por animal"
        uuid local_id FK "um caso por local"
        text codigo_edicao "hash do código, para autor sem conta"
        uuid id_cliente UK "gerado no aparelho, para a fila sem conexão"
        text relato
        timestamptz ocorrido_em
        timestamptz publicado_em
        timestamptz ultima_interacao_em "última ação do autor"
        timestamptz cobrado_em "pedido de confirmação pendente"
    }

    ANIMAL {
        uuid id PK
        text especie "cachorro | gato"
        text porte "pequeno | medio | grande"
        text cor_dominante "caramelo | preto | branco | malhado | cinza"
        text coleira "com | sem | nao_observado"
        text nome "nulo quando desconhecido"
        boolean castrado
    }

    FOTO {
        uuid id PK
        uuid animal_id FK
        text caminho
        integer largura
        integer altura
        timestamptz enviada_em
    }

    LOCAL {
        uuid id PK
        geography ponto "Point 4326"
        text bairro
        integer raio_imprecisao_m
        text referencia
    }

    AVISTAMENTO {
        uuid id PK
        uuid caso_id FK
        uuid pessoa_id FK "nulo quando anonimo"
        uuid local_id FK
        timestamptz visto_em
        text observacao
        timestamptz criado_em
    }

    PERGUNTA_VERIFICACAO {
        uuid id PK
        uuid caso_id FK
        smallint ordem "1 | 2 | 3"
        text enunciado
        text resposta_esperada "só o autor vê, na lista de reivindicações"
    }

    TENTATIVA_VERIFICACAO {
        uuid id PK
        uuid caso_id FK
        uuid pessoa_id FK
        text veredito "pendente | aceita | recusada"
        text codigo_acompanhamento UK "hash do código de quem reivindicou"
        text referencia "onde está o animal, quando quem reivindica está com ele"
        uuid caso_proprio_id FK "caso do outro lado, quando veio de uma pista"
        timestamptz criado_em
        timestamptz decidido_em
        timestamptz contato_visto_em "primeira vez que o contato liberado foi lido"
    }

    RESPOSTA_VERIFICACAO {
        uuid id PK
        uuid tentativa_id FK
        uuid pergunta_id FK
        text texto
    }

    PAREAMENTO {
        uuid id PK
        uuid caso_perdido_id FK
        uuid caso_encontrado_id FK
        integer distancia_m
        integer dias_diferenca
        jsonb atributos_batem
        jsonb atributos_divergem
        text veredito "pendente | confirmado | descartado"
        timestamptz gerado_em
        timestamptz decidido_em
    }

    DESFECHO {
        uuid id PK
        uuid caso_id FK UK
        text tipo "voltou_para_casa | foi_adotado | nao_encontrado"
        timestamptz ocorrido_em
        timestamptz registrado_em
    }

    DENUNCIA {
        uuid id PK
        uuid caso_id FK
        uuid tentativa_id FK "nula quando a denúncia é do caso"
        text motivo "pediu_dinheiro | respostas_suspeitas | outro"
        text texto
        timestamptz criado_em
    }
```

---

## 2. Entidades

### `pessoa`
Quem interage com o sistema. Pode existir sem conta, e nesse caso `email` e
`senha_hash` ficam nulos: o acesso ao caso se dá pelo código de edição, do qual o
banco guarda só o hash, em `caso.codigo_edicao`. O telefone só é revelado depois que o autor do caso libera o contato.

### `caso`
A publicação. `tipo` define o lado: quem perdeu ou quem achou. `estado` guarda o
ciclo de vida. `ultima_interacao_em` guarda a última ação de quem publicou
(confirmar, editar, decidir uma pista ou reivindicação, informar o desfecho) e é a
coluna que a tarefa diária de cobrança lê; aviso de terceiros não renova o caso,
senão um anúncio abandonado ficaria vivo para sempre. `cobrado_em` marca o pedido
de confirmação: o caso só expira depois dele. `id_cliente` é gerado no aparelho
quando a publicação passa pela fila sem conexão, para um reenvio não criar caso
repetido. Cada caso tem
o seu animal e o seu local, e nenhum dos dois é compartilhado: por isso
`animal_id` e `local_id` são únicos. O avistamento grava o próprio local.

### `animal`
Os atributos do bicho. Os quatro primeiros (espécie, porte, cor dominante e
coleira) são exatamente o que o pareamento compara, e por isso são vocabulário
fechado, nunca texto livre.

### `foto`
Guardada já em tamanho reduzido, para caber no limite de dados de quem publica
pela rua. Uma foto pode não existir: quem publica sem sinal envia depois.

### `local`
Ponto geográfico com `geography(Point, 4326)` e `raio_imprecisao_m`. O ponto
exato nunca é publicado: a API expõe o centro deslocado e o raio, e o aplicativo
desenha um círculo.

### `avistamento`
Quem viu o animal na rua sem estar com ele. `pessoa_id` pode ser nulo, porque avistar
não exige conta. É o registro que alimenta a linha "3 pessoas disseram ter visto".

### `pergunta_verificacao`
Exatamente três por caso, criadas na publicação. `resposta_esperada` é a coluna
mais sensível do banco: **nunca é serializada em resposta pública**. A única
exceção é a lista de reivindicações do próprio caso, que exige o código de edição:
ali o autor vê a resposta que ele mesmo cadastrou ao lado da que recebeu, para
comparar.

### `tentativa_verificacao`
Uma reivindicação: alguém disse "esse animal é meu" (caso encontrado) ou "acho que
achei o seu" (caso perdido) e respondeu as perguntas. `veredito` guarda a decisão
humana do autor do caso. O sistema não decide. Sem conta, quem reivindica volta
para ver a decisão com o código de acompanhamento, guardado só como hash.
`referencia` é preenchida quando quem reivindica é quem está com o animal.
`contato_visto_em` registra a primeira leitura do contato liberado, para
auditoria.

### `resposta_verificacao`
O que a pessoa respondeu. Visível apenas para o autor do caso.

### `pareamento`
Par de casos de lados opostos considerados candidatos. `atributos_batem` e
`atributos_divergem` guardam a explicação, não um score: é o que a tela mostra
quando apresenta uma pista. O `veredito` é sempre de uma pessoa.

### `desfecho`
Como o caso terminou. Um por caso, obrigatório no encerramento. É o dado que
sustenta o artigo: sem desfecho registrado, não há o que medir.

### `denuncia`
Alguém apontou comportamento suspeito num caso ou numa reivindicação: pedido de
dinheiro, respostas chutadas ou outro motivo. Não esconde nada sozinha, porque
isso viraria arma contra quem é denunciado; o autor do caso vê, antes de aceitar
uma reivindicação, quantas denúncias o telefone dela já recebeu.

---

## 3. Esquema físico

> Os valores aceitos em cada coluna de vocabulário fechado são declarados uma
> única vez no código da aplicação, e a migração é gerada a partir dessa
> declaração. O SQL abaixo é o resultado esperado dessa geração, e não a fonte a
> ser editada à mão: valor escrito solto dentro de um `CHECK` é exatamente o que
> faz o banco divergir do código.

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE pessoa (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome          text NOT NULL,
    telefone      text,
    email         text UNIQUE,
    senha_hash    text,
    criado_em     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT conta_completa CHECK (
        (email IS NULL AND senha_hash IS NULL) OR
        (email IS NOT NULL AND senha_hash IS NOT NULL)
    )
);

CREATE TABLE animal (
    id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    especie        text NOT NULL CHECK (especie IN ('cachorro','gato')),
    porte          text NOT NULL CHECK (porte IN ('pequeno','medio','grande')),
    cor_dominante  text NOT NULL CHECK (cor_dominante IN ('caramelo','preto','branco','malhado','cinza')),
    coleira        text NOT NULL CHECK (coleira IN ('com','sem','nao_observado')),
    nome           text,
    castrado       boolean
);

CREATE TABLE local (
    id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    ponto              geography(Point, 4326) NOT NULL,
    bairro             text,
    raio_imprecisao_m  integer NOT NULL DEFAULT 300 CHECK (raio_imprecisao_m > 0),
    referencia         text
);

CREATE TABLE caso (
    id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo                 text NOT NULL CHECK (tipo IN ('perdido','encontrado')),
    estado               text NOT NULL DEFAULT 'procurando'
                         CHECK (estado IN ('procurando','abrigado_temporariamente',
                                           'em_contato','resolvido','expirado')),
    autor_id             uuid NOT NULL REFERENCES pessoa(id) ON DELETE RESTRICT,
    animal_id            uuid NOT NULL UNIQUE REFERENCES animal(id) ON DELETE CASCADE,
    local_id             uuid NOT NULL UNIQUE REFERENCES local(id) ON DELETE RESTRICT,
    codigo_edicao        text UNIQUE,  -- HMAC-SHA-256 do código; o código em claro não é guardado
    id_cliente           uuid UNIQUE,  -- gerado no aparelho pela fila sem conexão
    relato               text,
    ocorrido_em          timestamptz NOT NULL,
    publicado_em         timestamptz NOT NULL DEFAULT now(),
    ultima_interacao_em  timestamptz NOT NULL DEFAULT now(),
    cobrado_em           timestamptz
);

CREATE TABLE foto (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    animal_id   uuid NOT NULL REFERENCES animal(id) ON DELETE CASCADE,
    caminho     text NOT NULL,
    largura     integer NOT NULL,
    altura      integer NOT NULL,
    enviada_em  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE avistamento (
    id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    caso_id      uuid NOT NULL REFERENCES caso(id) ON DELETE CASCADE,
    pessoa_id    uuid REFERENCES pessoa(id) ON DELETE SET NULL,
    local_id     uuid NOT NULL REFERENCES local(id) ON DELETE RESTRICT,
    visto_em     timestamptz NOT NULL,
    observacao   text,
    criado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pergunta_verificacao (
    id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    caso_id           uuid NOT NULL REFERENCES caso(id) ON DELETE CASCADE,
    ordem             smallint NOT NULL CHECK (ordem BETWEEN 1 AND 3),
    enunciado         text NOT NULL,
    resposta_esperada text NOT NULL,
    UNIQUE (caso_id, ordem)
);

CREATE TABLE tentativa_verificacao (
    id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    caso_id      uuid NOT NULL REFERENCES caso(id) ON DELETE CASCADE,
    pessoa_id    uuid NOT NULL REFERENCES pessoa(id) ON DELETE RESTRICT,
    veredito     text NOT NULL DEFAULT 'pendente'
                 CHECK (veredito IN ('pendente','aceita','recusada')),
    codigo_acompanhamento text NOT NULL UNIQUE,  -- HMAC-SHA-256 do código de quem reivindicou
    referencia   text,
    caso_proprio_id uuid REFERENCES caso(id) ON DELETE SET NULL,
    criado_em    timestamptz NOT NULL DEFAULT now(),
    decidido_em  timestamptz,
    contato_visto_em timestamptz
);

CREATE TABLE resposta_verificacao (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tentativa_id  uuid NOT NULL REFERENCES tentativa_verificacao(id) ON DELETE CASCADE,
    pergunta_id   uuid NOT NULL REFERENCES pergunta_verificacao(id) ON DELETE CASCADE,
    texto         text NOT NULL,
    UNIQUE (tentativa_id, pergunta_id)
);

CREATE TABLE pareamento (
    id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    caso_perdido_id      uuid NOT NULL REFERENCES caso(id) ON DELETE CASCADE,
    caso_encontrado_id   uuid NOT NULL REFERENCES caso(id) ON DELETE CASCADE,
    distancia_m          integer NOT NULL,
    dias_diferenca       integer NOT NULL,
    atributos_batem      jsonb NOT NULL DEFAULT '[]'::jsonb,
    atributos_divergem   jsonb NOT NULL DEFAULT '[]'::jsonb,
    veredito             text NOT NULL DEFAULT 'pendente'
                         CHECK (veredito IN ('pendente','confirmado','descartado')),
    gerado_em            timestamptz NOT NULL DEFAULT now(),
    decidido_em          timestamptz,
    UNIQUE (caso_perdido_id, caso_encontrado_id),
    CONSTRAINT lados_diferentes CHECK (caso_perdido_id <> caso_encontrado_id)
);

CREATE TABLE desfecho (
    id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    caso_id        uuid NOT NULL UNIQUE REFERENCES caso(id) ON DELETE CASCADE,
    tipo           text NOT NULL CHECK (tipo IN ('voltou_para_casa','foi_adotado','nao_encontrado')),
    ocorrido_em    timestamptz NOT NULL,
    registrado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE denuncia (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    caso_id       uuid NOT NULL REFERENCES caso(id) ON DELETE CASCADE,
    tentativa_id  uuid REFERENCES tentativa_verificacao(id) ON DELETE SET NULL,
    motivo        text NOT NULL CHECK (motivo IN ('pediu_dinheiro','respostas_suspeitas','outro')),
    texto         text,
    criado_em     timestamptz NOT NULL DEFAULT now()
);
```

## 4. Índices

```sql
-- Obrigatório. Sem ele a consulta do mural degrada e ninguém percebe
-- até o banco encher.
CREATE INDEX idx_local_ponto ON local USING GIST (ponto);

CREATE INDEX idx_caso_estado_tipo    ON caso (estado, tipo);
CREATE INDEX idx_caso_ultima_inter   ON caso (ultima_interacao_em)
    WHERE estado IN ('procurando','abrigado_temporariamente','em_contato');
CREATE INDEX idx_pareamento_perdido  ON pareamento (caso_perdido_id, veredito);
CREATE INDEX idx_avistamento_caso    ON avistamento (caso_id, criado_em DESC);
```

## 5. A consulta que sustenta o produto

O mural inteiro depende desta consulta: casos abertos dentro do raio, ordenados
por distância.

```sql
SELECT c.id, c.tipo, a.especie, a.porte, a.cor_dominante,
       ST_Distance(l.ponto, $1::geography)::int AS distancia_m
  FROM caso c
  JOIN local  l ON l.id = c.local_id
  JOIN animal a ON a.id = c.animal_id
 WHERE c.estado IN ('procurando','abrigado_temporariamente')
   AND ST_DWithin(l.ponto, $1::geography, $2)   -- $2 = raio em metros, padrão 1600
 ORDER BY distancia_m
 LIMIT 50;
```

`ST_DWithin` usa o índice GIST; `ST_Distance` no `SELECT` não usaria sozinho.
Trocar a ordem dessas duas chamadas é o erro que transforma a consulta em varredura
completa da tabela.

## 6. O que o banco garante e o que a aplicação garante

Separação deliberada: o que estiver na coluna errada vira defeito silencioso.

| Garantido pelo banco | Garantido pela aplicação |
|---|---|
| Vocabulário fechado, por `CHECK` | Que sejam exatamente 3 perguntas por caso |
| Um desfecho por caso, por `UNIQUE` | Transição válida entre estados do caso |
| Um animal e um local por caso, por `UNIQUE` | Que o código de edição só exista em claro na resposta da publicação |
| Par de casos único, por `UNIQUE` | Que o pareamento só ligue lados opostos |
| Uma resposta por pergunta em cada tentativa | Que `resposta_esperada` só saia para o autor, na lista de reivindicações |
| Código de acompanhamento único, por `UNIQUE` | Teto de reivindicações pendentes e nenhuma repetição de telefone recusado |
| Integridade referencial | Deslocamento do ponto antes de publicar |

**Ponto de atenção para a revisão:** o banco não impede pareamento entre dois
casos do mesmo tipo. É regra de negócio e vive no serviço `GeradorDePareamentos`,
com teste.

## 7. Dados sensíveis

| Coluna | Por que é sensível | Proteção |
|---|---|---|
| `pergunta_verificacao.resposta_esperada` | É a prova; vazou, acabou a verificação | Só sai para o autor, com o código de edição, na lista de reivindicações. Teste automatizado sobre o corpo de toda resposta pública |
| `pessoa.telefone` | Contato pessoal | Só após liberação (F7); apagado 30 dias depois do encerramento (LGPD) |
| `caso.codigo_edicao` | Dá poder de editar e encerrar o caso | Guardado só como HMAC com segredo do servidor; o código aparece uma vez, para quem publicou |
| `tentativa_verificacao.codigo_acompanhamento` | Dá acesso ao contato liberado | Mesmo tratamento do código de edição |
| `tentativa_verificacao.referencia` | Pode ser a casa de quem está com o animal | Só depois do aceite, só para o outro lado |
| `local.ponto` | Pode revelar residência | Publicado como área aproximada |
| `local.ponto` de um avistamento | Pode ser a casa de quem avisou | Quem publicou vê só a distância e o bairro |
| `resposta_verificacao.texto` | Contém detalhe íntimo do animal | Visível só ao autor do caso |
